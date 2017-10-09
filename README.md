# uploadenc
Writes client-uploaded files directly to Amazon S3, encrypting them to a given public key in the process. Works great for securely sending yourself personal pictures from your phone, for example.

Overview:

* Uses node's https module to listen on given port (default 443)
* By default serves index.html with a simple html form containing an upload input that accepts multiple files
* When client clicks upload, data is encrypted on the fly and sent to a configured S3 bucket (using [AWS credentials](http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/getting-started-nodejs.html))

Needs a 1024+ bit RSA public key and working SSL certs to function.
To create RSA keys:

>openssl genrsa -out private.pem 4096

>openssl rsa -in private.pem -pubout > key.pub

__private.pem__ is to be kept in a secure place, preferrably completely offline. *Do not keep private.pem anywhere on the server.* __key.pub__ does need to be on the server, alongside this code.



Needs at least Node v6.11 to work properly. Works fine on a Raspberry Pi, even with multi-GB file uploads.
