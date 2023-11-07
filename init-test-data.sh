#!/usr/bin/env bash
SCRIPT_ROOT=$(cd $(dirname $0); pwd)
export MY_CA_ROOT_DIR=$SCRIPT_ROOT/debug/pki

# Start generating the Root CA.

rm -rf $MY_CA_ROOT_DIR
mkdir -p $MY_CA_ROOT_DIR

cd $MY_CA_ROOT_DIR
mkdir -p $MY_CA_ROOT_DIR/{certs,crl,csr,newcerts,private}

MY_CA_RAND_FILE=$MY_CA_ROOT_DIR/.rand

mkdir -p newcerts crl
touch index.txt

openssl rand -out $MY_CA_RAND_FILE 65535
md5sum $MY_CA_RAND_FILE | grep -Po '^\w+' > serial

openssl rand -out $MY_CA_RAND_FILE 1048576

MY_CA_ROOT_KEY_PATH=$MY_CA_ROOT_DIR/root-key.pem

openssl genrsa \
    -rand $MY_CA_RAND_FILE \
    -out $MY_CA_ROOT_KEY_PATH \
    4096

MY_CA_ROOT_REQ_PATH=$MY_CA_ROOT_DIR/req.cnf

cat > $MY_CA_ROOT_REQ_PATH << EOL
[ req ]

distinguished_name  = req_distinguished_name
string_mask         = utf8only
prompt              = no

# SHA-1 is deprecated, so use SHA-2 instead.
default_md          = sha384

# Extension to add when the -x509 option is used.
x509_extensions     = v3_ca
req_extensions     = v3_ca

[ req_distinguished_name ]
# See <https://en.wikipedia.org/wiki/Certificate_signing_request>.
countryName                     = CN
0.organizationName              = LiteRT ORG
organizationalUnitName          = ca.litert.org
commonName                      = LiteRT CA R1

[ v3_ca ]

subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
EOL

MY_CA_ROOT_CERT_PATH=$MY_CA_ROOT_DIR/ca.pem

openssl req -config $MY_CA_ROOT_REQ_PATH \
    -new \
    -x509 \
    -extensions v3_ca \
    -days 10950 \
    -key $MY_CA_ROOT_KEY_PATH \
    -out $MY_CA_ROOT_CERT_PATH

openssl x509 -noout -text -in $MY_CA_ROOT_CERT_PATH

MY_CA_ROOT_CONF_PATH=$MY_CA_ROOT_DIR/ca.cnf

cat > $MY_CA_ROOT_CONF_PATH << EOL
[ ca ]
default_ca = CA_default

[ CA_default ]
# Directory and file locations.
dir               = $MY_CA_ROOT_DIR
certs             = \$dir/certs
crl_dir           = \$dir/crl
new_certs_dir     = \$dir/newcerts
database          = \$dir/index.txt
serial            = \$dir/serial
RANDFILE          = \$dir/.rand

# The root key and root certificate.
private_key       = \$dir/root-key.pem
certificate       = \$dir/ca.pem

# For certificate revocation lists.
crlnumber         = \$dir/crlnumber
crl               = \$dir/crl/ca.crl.pem
crl_extensions    = crl_ext
default_crl_days  = 30
copy_extensions   = copy

# SHA-1 is deprecated, so use SHA-2 instead.
default_md        = sha256

name_opt          = ca_default
cert_opt          = ca_default
default_days      = 375
preserve          = no
policy            = policy_loose

# [ policy_strict ]
# # The root CA should only sign intermediate certificates that match.
# countryName             = match
# stateOrProvinceName     = optional
# organizationName        = match
# organizationalUnitName  = optional
# commonName              = supplied
# emailAddress            = optional

[ policy_loose ]
# Allow the intermediate CA to sign a more diverse range of certificates.
countryName             = optional
stateOrProvinceName     = optional
localityName            = optional
organizationName        = optional
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ req ]
default_bits        = 4096
distinguished_name  = req_distinguished_name
string_mask         = utf8only
prompt              = no

# SHA-1 is deprecated, so use SHA-2 instead.
default_md          = sha384

# Extension to add when the -x509 option is used.
x509_extensions     = v3_ca

[ req_distinguished_name ]
# See <https://en.wikipedia.org/wiki/Certificate_signing_request>.
countryName                     = CN
0.organizationName              = LiteRT ORG
organizationalUnitName          = ca.litert.org
commonName                      = LiteRT CA R1

[ v3_ca ]
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints = critical, CA:true
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
extendedKeyUsage = critical, clientAuth, serverAuth

[ v3_intermediate_ca ]
keyUsage = critical, digitalSignature, cRLSign, keyCertSign
extendedKeyUsage = critical, clientAuth, serverAuth
basicConstraints = critical, CA:true, pathlen:0
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
# authorityInfoAccess = caIssuers;URI:http://demo.org/ca.html
# crlDistributionPoints = URI:http://demo.org/ca.crl
# certificatePolicies = 2.23.140.1.2.1,@policy_issuer_info

# [ policy_issuer_info ]
# policyIdentifier = 1.3.6.1.4.1.44947.1.2.3.4.5.6.7.8

[ client_cert ]
# Extensions for client certificates (man x509v3_config).
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
keyUsage = critical, nonRepudiation, digitalSignature, keyEncipherment
extendedKeyUsage = clientAuth

[ server_cert ]
# Extensions for server certificates (man x509v3_config).
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always

[ crl_ext ]
authorityKeyIdentifier=keyid:always

[ ocsp ]
basicConstraints = CA:FALSE
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer:always
keyUsage = critical, digitalSignature
extendedKeyUsage = critical, OCSPSigning
EOL

echo 'unique_subject = no' > $MY_CA_ROOT_DIR/index.txt.attr

# Generate server certification

generate_server_cert() {

    MY_CA_L2_DIR=$MY_CA_ROOT_DIR

    NEW_CERT_DOMAIN=$1
    NEW_SERVER_KEY_PATH=$MY_CA_L2_DIR/private/server-$NEW_CERT_DOMAIN.key.pem

    openssl ecparam -rand $MY_CA_L2_DIR/.rand -genkey -name prime256v1 -noout -out $NEW_SERVER_KEY_PATH
    NEW_SERVER_CERT_REQ_PATH=$MY_CA_L2_DIR/csr/server-$NEW_CERT_DOMAIN.csr.cnf

    cat > $NEW_SERVER_CERT_REQ_PATH << EOL
[ req ]
distinguished_name  = req_distinguished_name
string_mask         = utf8only
req_extensions      = req_ext
x509_extensions     = v3_req

# SHA-1 is deprecated, so use SHA-2 instead.
default_md          = sha256
prompt              = no

[ req_distinguished_name ]
# See <https://en.wikipedia.org/wiki/Certificate_signing_request>.
commonName                      = $NEW_CERT_DOMAIN

[req_ext]
subjectAltName = @alt_names

[v3_req]
subjectAltName = @alt_names

[alt_names]
# IP.1 = 127.0.0.1
DNS.1 = $NEW_CERT_DOMAIN
EOL

    NEW_SERVER_CERT_CSR_PATH=$MY_CA_L2_DIR/csr/server-$NEW_CERT_DOMAIN.csr.pem

    openssl req \
        -config $NEW_SERVER_CERT_REQ_PATH \
        -new -sha256 \
        -key $NEW_SERVER_KEY_PATH \
        -out $NEW_SERVER_CERT_CSR_PATH

    openssl req \
        -in $NEW_SERVER_CERT_CSR_PATH \
        -noout \
        -text

    NEW_SERVER_CERT_PATH=$MY_CA_L2_DIR/newcerts/server-$NEW_CERT_DOMAIN.cert.pem

    openssl ca \
        -config $MY_CA_L2_DIR/ca.cnf \
        -extensions server_cert \
        -days 180 \
        -notext \
        -md sha256 \
        -batch \
        -in $NEW_SERVER_CERT_CSR_PATH \
        -out $NEW_SERVER_CERT_PATH

    NEW_SERVER_FULLCHAIN_PATH=$MY_CA_L2_DIR/newcerts/server-$NEW_CERT_DOMAIN.fullchain.pem

    cat > $NEW_SERVER_FULLCHAIN_PATH << EOL
$(cat $NEW_SERVER_CERT_PATH)

$(cat $MY_CA_L2_DIR/ca.pem)
EOL
}

generate_server_cert 'lwdfx1.litert.org'
generate_server_cert 'wss.litert.org'
generate_server_cert 'https.litert.org'
