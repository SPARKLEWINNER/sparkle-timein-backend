const AWS = require('aws-sdk')
require('dotenv').config()

var s3 = new AWS.S3({
    accessKeyId: process.env.ACCESS_KEY_ID,
    secretAccessKey: process.env.SECRET,
    region: 'us-east-2'
});

const pre_types = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "text/csv": ".csv",
    "text/doc": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/xlsx": ".xlsx",
    "application/pdf": ".pdf"
};

const getUploadURL = async function (_format, _type) {
    let actionId = Date.now();
    var s3Params = {
        Bucket: 'oheast2-upload-s3',
        Key: `${actionId}${_type}`,
        ContentType: `${_format}`,
        ACL: 'public-read',
    };

    console.log(s3Params);

    return new Promise((resolve, reject) => {
        // Get signed URL
        let uploadURL = s3.getSignedUrl('putObject', s3Params);
        resolve({
            "statusCode": 200,
            "isBase64Encoded": false,
            "headers": {
                "Access-Control-Allow-Origin": "*"
            },
            "body": JSON.stringify({
                "uploadURL": uploadURL,
                "photoFilename": `${actionId}${_type}`
            })
        });
    });
};

var controllers = {
  create_url: async function (req, res) {
    const body = req.body ? req.body : undefined;
    const _type = pre_types[body.file_type]
    const result = await getUploadURL(body.file_type, _type)
    if (result.statusCode !== 200) return res.status(502).json({success: false, msg: 'User not found'})
    return result;
  }
}

module.exports = controllers
