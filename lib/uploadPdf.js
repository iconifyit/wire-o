var uuid = require('node-uuid');
var AWS = require('aws-sdk');

AWS.config.setPromisesDependency(null);

function uploadPdf(buffer, callback) {
  var s3 = new AWS.S3();
  var key = 'merged/' + uuid.v4() + '.pdf';
  var params = { Bucket: 'superglue', Key: key, Body: buffer };

  console.time('Upload merged PDF to S3');

  var s3upload = s3.putObject(params).promise();

  s3upload.catch(function (err) {
    console.log('Error sending to S3: ' + err);
    return callback(err, null);
  });

  s3upload.then(function (data) {
    var link = 'https://s3.amazonaws.com/superglue/' + key;
    console.timeEnd('Upload merged PDF to S3');

    callback(null, link)
  });
}

module.exports = uploadPdf;