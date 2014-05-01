/**
 * Example configuration file
 */
module.exports = {
    settings: {
        // MongoDB database url
        db: {
            production: "mongodb://localhost/svmp_proxy_db",
            test: "mongodb://localhost/svmp_proxy_db_test"
        },

        // External TCP port to listen on for client connections.
        // default = 8002
        port: 8002,

        // Port to connect to on Android VMs
        // default = 8001
        vm_port: 8001,

        // Enable SSL
        // default = false
        tls_proxy: true,

        // SSL certificate and private key paths
        // (required if tls_proxy == true)
        tls_certificate: './tls/server-cert.pem',
        tls_private_key: './tls/server-key.pem',

        // SSL private key password
        // (if the server private key file is password protected)
        tls_private_key_pass: '',

        // Use TLS client authentication
        // default = false
        use_tls_user_auth: false,

        // TLS CA Cert to validate user certs against
        // only used if use_tls_user_auth == true
        tls_ca_cert: './tls/ca-cert.pem',

        // Maximum length of a client session (in seconds) before it is
        // forcibly disconnected.
        // default = 21600 [6 hours]
        max_session_length: 21600,

        // Validity time of session tokens in seconds.
        // Allows client to reconnect a disconnected session by providing
        // the token instead of doing a full re-authentication.
        // default = 300 [5 minutes]
        session_token_ttl: 300,

        // Interval (in seconds) of time to check for expired sessions.
        // This is used while a connection is active.
        // default = 60 [1 minute]
        session_check_interval: 60,

        // Maximum life span of an idle VM (in seconds) before it is expired and gets destroyed.
        // This is used after a session is disconnected.
        // default = 3600 [1 hour]
        vm_idle_ttl: 3600,

        // Interval (in seconds) of time to check for expired VMs.
        // This is used after a session is disconnected.
        // default = 300 [5 minutes]
        vm_check_interval: 300,

        // Use PAM authentication
        // default = false
        use_pam: false,

        // PAM 'service' name to use. I.e., which file under /etc/pam.d/
        // default = 'svmp'
        pam_service: 'svmp',

        // Web Console
        // Enable email functionality for the web console
        // default = false
        sendmail: false,
        // SMTP server, username, and password
        // TODO: what format?
        smtp: '',
        // Admin email address
        admincontact: '',

        // Log file path
        // default = 'proxy_log.txt'
        log_file: 'proxy_log.txt',

        // Log level to use, omits lower log levels
        // Levels, lowest to highest: silly, debug, verbose, info, warn, error
        // default = 'info'
        log_level: 'info',

        // Protobuf request messages to filter out when using verbose logging
        // default = ['SENSOREVENT', 'TOUCHEVENT']
        log_request_filter: ['SENSOREVENT', 'TOUCHEVENT'],

        // Openstack cloud connection details
        openstack: {
            "authUrl": "http://localhost:5000/",
            "username": "test",
            "password": "test",
            "tenantId": "0123456789abcdef0123456789abcdef",
            "tenantName": "test",
            "region": "RegionOne"
        },

        // VM/Volume defaults
        // images: a map of device types to their respective image ids on the Openstack server.
        // vmflavor: the number value (as a string) of the VM flavor. Ex: m1.tiny = '1', m1.small = '2'  See Openstack
        //   for available values for your setup. Or run bin/spm image for a listing. Note: GUID values won't work.
        // goldsnapshotId: the snapshot id to use for new volumes
        // goldsnapshotSize: the integer size in GBs. THIS SHOULD BE SAME AS THE goldsnapshot SIZE
        // use_floating_ip: if this is enabled, we assign a floating IP address to the VM when we start it. This is
        //   necessary if the proxy server isn't running within Openstack itself.
        // floating_ip_pool: if use_floating_ip is enabled, this can be optionally specified to tell Openstack what
        //   ip pool to use when allocating new addresses
        // pollintervalforstartup: this is the interval in milliseconds the apis to check for a running VM

        new_vm_defaults: {
            "images": {
                // each device type should have its own name and image ID in key/value format, e.g.:
                // "device_type": "imageID",
            },
            vmflavor: "1",
            goldsnapshotId: "",
            goldsnapshotSize: 6,
            use_floating_ips: false,
            floating_ip_pool: "nova",
            pollintervalforstartup: 2000
        }
    },
    // Video Information sent from Proxy to Client
    webrtc: {
        ice: { iceServers: [
            {url: 'stun:127.0.0.1:3478'}
        ]}, // change IP and port to match your STUN server
        video: { audio: true, video: { mandatory: {}, optional: []}},
        pc: {optional: [
            {DtlsSrtpKeyAgreement: true}
        ]}
    }
};