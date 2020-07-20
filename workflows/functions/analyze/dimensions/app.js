/*
  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
  Permission is hereby granted, free of charge, to any person obtaining a copy of this
  software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify,
  merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
  permit persons to whom the Software is furnished to do so.
  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
  INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
  PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
  HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
  OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

/* Expected event format:
  {
    "version": "0",
    "id": "4d243389-1234-1234-1234-459ef3d88e93",
    "detail-type": "uploadComplete",
    "source": "custom.happyPath",
    "account": "123456789012",
    "time": "2020-07-08T17:35:22Z",
    "region": "us-east-1",
    "resources": [],
    "detail": {
      "bucket": "happy-path-upload",
      "key": "4b02d0c3-1234-1234-1234-36af82130d72.jpg",
      "placeId": "ChIJxQx-bXa_4okR_RRYZ1b_qhE",
      "ID": "4b02d0c3-1234-1234-1234-36af82130d72"
    }
  }  
*/
'use strict'

const AWS = require('aws-sdk')
AWS.config.update({region: process.env.AWS_REGION})
const s3 = new AWS.S3()
const sizeOf = require('image-size')

// Standard Lambda handler
exports.handler = async (event) => {
  console.log(event)

  // Get original object
  const s3Object = await s3.getObject({
    Bucket: event.detail.bucket,
    Key: event.detail.key
  }).promise()

  // Check dimensions
  event.dimensions = sizeOf(s3Object.Body)
  event.dimensionsResult = true

  if (event.dimensions.height < process.env.minPixels || event.dimensions.width < process.env.minPixels) {
    event.dimensionsResult = false
    event.workflowDetail = JSON.stringify({
      reason: 'IMAGE_TOO_SMALL', 
      reasonDetail: event.dimensions
    })
  }

  // Check file type is in list of allowed types
  const types = process.env.allowedTypes.split(',')
  if (!types.includes(event.dimensions.type)) {
    event.dimensionsResult = false
    event.workflowDetail = JSON.stringify({
      reason: 'UNSUPPORTED_TYPE', 
      reasonDetail: event.dimensions
    })
  }

  return event
}
