/*
 * Copyright 2013 The MITRE Corporation, All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this work except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * author Dave Bryson
 *
 */
var PkgCloud = require('pkgcloud'),
    Q = require('q'),
    settings = global.config.settings;

var computeClient  = PkgCloud.providers.openstack.compute.createClient(settings.openstack);
var blockClient = PkgCloud.providers.openstack.blockstorage.createClient(settings.openstack);

exports.getImages = function(callback) {
    computeClient.getImages(function (err, images) {
        var list = [];
        if (err) {
            callback(err);
        }
        images.forEach(function (v, i, d) {
            list.push({_id : v.id, name : v.name});
        });
        callback(undefined, list);
    });
};

// Where object should be {user_id: useridentifier, flavor: flava, image: im};
exports.createVM = function (obj, callback) {
    obj.name = "svmp_user_vm_" + obj.user_id;
    computeClient.createServer(obj, function (err, server) {
        if (err) {
            console.log("Error: ", err);
            callback(err);
        } else {
            server.setWait({status: server.STATUS.running}, 5000, function (err) {
                if (err) {
                    callback(err);
                } else {
                    if (server.addresses && server.addresses.private && server.addresses.private.length > 0) {
                        callback(undefined, {id : server.id, ip : server.addresses.private[0]});
                    } else {
                        callback("Cannot get IP for VM");
                    }
                }
            });
        }
    });
};

/**
 * Create a Volume for a user. Normally used in the CLI
 * @param {string} Username
 * @param {function} in the form of function(err, result), result is: {volId: volume.id, volName: name of the volume}
 */
exports.createUserVolume = function (username, callback) {
    var nme = username + "_volume";
    var desc = "Block Storage for: " + username;
    var goldSize = settings.new_vm_defaults.goldsnapshotSize;
    var goldId = settings.new_vm_defaults.goldsnapshotId;

    var opts = {name: nme, size: goldSize, description: desc, snapshotId: goldId };
    blockClient.createVolume(opts, function(err, v) {
        if(err) {
            callback(err);
        } else {
            callback(undefined,{id: v.id, name: v.name});
        }
    });
}

/*
 * Destroys a VM for a user. Used during the background interval in the proxy.
 * @param {Obj} the request object: {vm_id: ''}
 * @returns a Promise with the request object
 */
exports.destroyVM = function (obj, callback) {
    var deferred = Q.defer();
    // we only need to try to destroy the VM if the vm_id is defined
    if (obj.vm_id) {
        client.destroyServer(obj.vm_id, function(err, id) {
            if (err) {
                deferred.reject(new Error("destroyVM failed: " + err));
            } else {
                deferred.resolve(obj);
            }
        });
    } else {
        deferred.resolve(obj);
    }
    return deferred.promise;
}
