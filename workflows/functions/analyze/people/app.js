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

/* Expected EventBridge event format:
  {
    version: '0',
    id: '4d243389-1234-1234-1234-459ef3d88e93',
    'detail-type': 'uploadComplete',
    source: 'custom.happyPath',
    account: '123456789012',
    time: '2020-07-03T15:05:00Z',
    region: 'us-east-1',
    resources: [],
    detail: {
      bucket: 'happy-path-upload',
      key: 'ChIJKU9_ejHA4okRTMnj1DSlZlg/8c97f22f-1234-1234-1234-abc21dbb7bd0.jpg'
    }
  }
*/
'use strict'

const AWS = require('aws-sdk')
AWS.config.update({region: process.env.AWS_REGION})
const rekognition = new AWS.Rekognition();

// Standard Lambda handler
exports.handler = async (event) => {
  console.log(event)

  // Get labels from image
  event.labels = await processEvent(event)

  // Count number of people in image
  event.totalPeople = 0
  event.labels.map((label) => {
    if (label.Name === 'Person') {
      event.totalPeople = label.Instances.length
      event.workflowDetail = JSON.stringify({
        reason: 'NO_PEOPLE_ALLOWED', 
        reasonDetail: `${label.Instances.length} found in image`
      })
    }
  })

  return event
}

// Promisified wrapper for detectModerationLabels
const detectLabels = (params) => {
  return new Promise((resolve, reject) => {
    rekognition.detectLabels(params, function(err, data) {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

// Call Amazon Rekognition
const processEvent = async (event) => {
  const params = {
    Image: { 
      S3Object: {
        Bucket: event.detail.bucket,
        Name: event.detail.key
      }
    }
  }

  const result = await detectLabels(params)
  return result.Labels
}
