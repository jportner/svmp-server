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

'use strict';

var PkgCloud = require('pkgcloud'),
    Q = require('q'),
    settings = global.config.settings;

var computeClient = PkgCloud.providers.openstack.compute.createClient(settings.openstack);
var blockClient = PkgCloud.providers.openstack.blockstorage.createClient(settings.openstack);

/**
 * Get all the flavors available in Openstack
 * @param callback
 */
exports.getFlavors = function (callback) {
    computeClient.getFlavors(function (err, flavors) {
        var list = [];
        if (err) {
            callback(err);
        } else {
            flavors.forEach(function (v, i, d) {
                list.push({_id: v.id, name: v.name});
            });
            callback(undefined, list);
        }
    });
};

/**
 * Return a list of VM image information
 * @param callback
 */
exports.getImages = function (callback) {
    computeClient.getImages(function (err, images) {
        var list = [];
        if (err) {
            callback(err);
        } else {
            images.forEach(function (v, i, d) {
                list.push({_id: v.id, name: v.name});
            });
            callback(undefined, list);
        }
    });
};

/**
 * Create and Start a VM
 *
 * @param user the User object
 * @param image image ID
 * @param flavor image flavor number
 * @returns {adapter.deferred.promise|*|promise|Q.promise}
 */
exports.createAndStartVM = function (user, image, flavor) {
    var deferred = Q.defer();
    var vmObj = {
        name: "svmp_user_vm_" + user.username,
        flavor: flavor,
        image: image
    };
    computeClient.createServer(vmObj, function (err, server) {
        if (err) {
            deferred.reject(new Error('Creating VM: ' + err.message));
        } else {
            server.setWait({status: server.STATUS.running}, settings.new_vm_defaults.pollintervalforstartup, function (err) {
                if (err) {
                    deferred.reject(new Error('Starting VM: ' + err.message));
                } else {
                    if (server.addresses && server.addresses.private && server.addresses.private.length > 0) {
                        user.vm_ip = server.addresses.private[0];
                        user.vm_id = server.id;
                        deferred.resolve(user);
                    } else {
                        deferred.reject(new Error('Cannot find IP of new VM'));
                    }
                }
            });
        }
    });
    return deferred.promise;
};

/**
 * Create a Volume for a User
 * @param user object
 * @returns {adapter.deferred.promise|*|promise|Q.promise}
 */
exports.createVolumeForUser = function (user) {
    var deferred = Q.defer();
    var nme = user.username + "_volume";
    var desc = "Block Storage for: " + user.username;
    var goldSize = settings.new_vm_defaults.goldsnapshotSize;
    var goldId = settings.new_vm_defaults.goldsnapshotId;

    var opts = {name: nme, size: goldSize, description: desc, snapshotId: goldId };

    blockClient.createVolume(opts, function (err, vol) {
        if (err) {
            deferred.reject(new Error('Creating Volume: ' + err.message));
        } else {
            user.volume_id = vol.id;
            deferred.resolve({user: user});
        }
    });

    return deferred.promise;
};

/**
 * Attach a Volume to a VM
 * @param user
 * @returns {adapter.deferred.promise|*|promise|Q.promise}
 */
exports.attachVolumeToVMForUser = function (user) {
    var deferred = Q.defer();
    computeClient.attachVolume(user.vm_id, user.volume_id, function (err, result) {
        if (err) {
            deferred.reject(new Error('Attaching to Volume: ' + err.message));
        } else {
            deferred.resolve(user);
        }
    });
    return deferred.promise;
};

/*
 * Destroys a VM for a user. Used during the background interval in the proxy.
 * @param {Obj} the request object: {vm_id: ''}
 * @returns a Promise with the request object
 */
exports.destroyVM = function (obj, callback) {
    var deferred = Q.defer();
    // we only need to try to destroy the VM if the vm_id is defined
    if (obj.vm_id) {
        computeClient.destroyServer(obj.vm_id, function (err, id) {
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
};
