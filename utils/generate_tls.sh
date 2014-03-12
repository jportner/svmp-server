#!/bin/bash
# Copyright 2013 The MITRE Corporation, All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this work except in compliance with the License.
# You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Author: Joe Portner
# Running this script will delete any existing keys/certificates and create new ones
# Adapted from guide: http://blog.callistaenterprise.se/2011/11/24/creating-self-signed-certificates-for-use-on-android/

# Change these variables
CA_ALIAS="ca-alias-name"
CA_PKEY_PASS="changeme_cakeypass"
SERVER_PKEY_PASS="changeme_serverkeypass"
CLIENT_PKEY_PASS="changeme_clientkeypass" # Only used when 'use_tls_user_auth' is enabled
CLIENT_TSTORE_PASS="changeme_clienttstorepass"

# If you set these higher than 1024, you will need the JCE unlimited strength files installed
CA_PKEY_BITS=2048
CLIENT_PKEY_BITS=2048
SERVER_PKEY_BITS=2048

# No need to change these variables
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" # the directory this script is in
OUT_PATH="$DIR/../out"
CA_CERT_CONFIG="$DIR/../tls/ca.cnf"
CLIENT_CERT_CONFIG="$DIR/../tls/client.cnf"
SERVER_CERT_CONFIG="$DIR/../tls/server.cnf"
BCJAR="$DIR/bcprov-jdk15on-150.jar"
CA_PKEY="$OUT_PATH/ca_pkey.pem"
C_PKEY="$OUT_PATH/client_pkey.pem"
S_PKEY="$OUT_PATH/server_pkey.pem"
CA_CERT="$OUT_PATH/ca_cert.pem"
C_CSR="$OUT_PATH/client_cert.csr"
C_CERT="$OUT_PATH/client_cert.pem"
S_CSR="$OUT_PATH/server_cert.csr"
S_CERT="$OUT_PATH/server_cert.pem"
C_KANDC="$OUT_PATH/client_pkey_and_cert.p12"
C_TSTORE="$OUT_PATH/client_truststore.bks"

# Verify the user has keytool
KEYTOOL=`which keytool`
if [[ -z $JAVA || -z $KEYTOOL ]] ; then
  echo "Can't find keytool on the path. Trying JAVA_HOME."
  if [ -z $JAVA_HOME ] ; then
    echo "JAVA_HOME not set. Aborting."
    exit 1
  else
    KEYTOOL=$JAVA_HOME/bin/keytool
  fi
fi

echo "Generating mutual SSL certificates..."
echo ""

# Make the output directory if it doesn't exist
mkdir -p "$OUT_PATH"

####################################################################
echo "1. CREATE PRIVATE KEYS"
rm -f "$CA_PKEY"
rm -f "$C_PKEY"
rm -f "$S_PKEY"
openssl genrsa -des3 -passout "pass:$CA_PKEY_PASS" -out "$CA_PKEY" $CA_PKEY_BITS
openssl genrsa -des3 -passout "pass:$CLIENT_PKEY_PASS" -out "$C_PKEY" $CLIENT_PKEY_BITS
openssl genrsa -des3 -passout "pass:$SERVER_PKEY_PASS" -out "$S_PKEY" $SERVER_PKEY_BITS
echo ""

####################################################################
echo "2. CREATE CA CERTIFICATE"
rm -f "$CA_CERT"
openssl req -new -x509 -key "$CA_PKEY" -passin "pass:$CA_PKEY_PASS" -out "$CA_CERT" -days 365 -config "$CA_CERT_CONFIG"
echo ""

####################################################################
echo "3. CREATE DEVICE CERTIFICATE SIGNING REQUESTS"
rm -f "$C_CSR"
rm -f "$S_CSR"
openssl req -new -key "$C_PKEY" -passin "pass:$CLIENT_PKEY_PASS" -out "$C_CSR" -config "$CLIENT_CERT_CONFIG"
openssl req -new -key "$S_PKEY" -passin "pass:$SERVER_PKEY_PASS" -out "$S_CSR" -config "$SERVER_CERT_CONFIG"
echo ""

####################################################################
echo "4. SIGN DEVICE CERTIFICATES WITH CA CERTIFICATE"
rm -f "$C_CERT"
rm -f "$S_CERT"
openssl x509 -req -in "$C_CSR" -CA "$CA_CERT" -CAkey "$CA_PKEY" -passin "pass:$CA_PKEY_PASS"  -CAcreateserial -out "$C_CERT" -days 500
openssl x509 -req -in "$S_CSR" -CA "$CA_CERT" -CAkey "$CA_PKEY" -passin "pass:$CA_PKEY_PASS"  -CAcreateserial -out "$S_CERT" -days 500
echo ""

####################################################################
echo "5. COMBINE CLIENT KEY AND CERTIFICATE"
rm -f "$C_KANDC"
# Combine the certificate and the private key for the client:
openssl pkcs12 -export -inkey "$C_PKEY" -passin "pass:$CLIENT_PKEY_PASS" -in "$C_CERT" -passout "pass:$CLIENT_PKEY_PASS" -out "$C_KANDC"
echo ""

####################################################################
echo "6. ADD CA CERTIFICATE TO CLIENT TRUST STORE"
rm -f "$C_TSTORE"
$KEYTOOL -import -v -trustcacerts -alias "$CA_ALIAS" -file "$CA_CERT" -keystore "$C_TSTORE" -storetype BKS -providerclass org.bouncycastle.jce.provider.BouncyCastleProvider -providerpath "$BCJAR" -storepass "$CLIENT_TSTORE_PASS" -noprompt
echo ""

####################################################################
echo "7. CLEANUP"
rm -f "$C_PKEY"
rm -f "$C_CSR"
rm -f "$S_CSR"
rm -f "$C_CERT"
echo ""

echo "Done!"
echo ""
# We should now have all files we need for a successful TLS/SSL mutual authentication.
# The files we use in our test proxy will be: server_pkey.pem, server_cert.pem, and ca_cert.pem.
# The file we compile in our Android application for server certificate trust (optional): client_truststore.bks
# The file we install on our Android device for certificate auth (optional, ICS+ only): client_pkey_and_cert.p12
