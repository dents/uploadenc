module.exports = {
    /***************************************************************************************************
     * Public key to be used for encryption. The corresponding private key is used to decrypt the files.
     * First, generate a private key and store it in a secure place offline:
     *  openssl genrsa -out private.pem 4096
     * Note that it needs to be at least 256 bits for this app but anything less than 2048 is unwise.
     * After creating a private key, generate a public key from it:
     *  openssl rsa -in private.pem -pubout > key.pub
     * Public key can be transmitted through insecure channels such as email. Upload it here.
     **************************************************************************************************/
    encryptToPub: 'key.pub',

    /***************************************************************************************************
     * Which S3 bucket encrypted files end up in. See AWS documentation for credentials setup:
     * http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html
     * TL;DR create text file at ~/.aws/credentials with these lines:
     *  [default]
     *  aws_access_key_id = YOUR_ACCESS_KEY_ID
     *  aws_secret_access_key = YOUR_SECRET_ACCESS_KEY
     * Get YOUR_ACCESS_KEY_ID and YOUR_SECRET_ACCESS_KEY from IAM.
     * 
     * When running this code inside AWS, just use instance roles and forget about config files.
     * http://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html
     */
    s3Bucket: 'my-aws-bucket-to-upload-encrypted-files-to',

    /***************************************************************************************************
     * These are available from let's encrypt or when generating self-signed certs.
     * Reference for creating SSL certs:
     * https://letsencrypt.org/getting-started/
     * https://stackoverflow.com/questions/10175812/how-to-create-a-self-signed-certificate-with-openssl
     */
    httpsKey: 'ssl-privkey.pem',
    httpsCert: 'ssl-cert.pem',
    httpsCA: 'ssl-fullchain.pem',

    // user/group to use when running privileged to access low ports (i.e. sudo node server.js)
    processGID: 'www-data',
    processUID: 'www-data',
};