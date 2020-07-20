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
const sharp = require('sharp')
const { ExifImage } = require('exif')

// Standard Lambda handler
exports.handler = async (event) => {
  console.log(event)
  return processEvent(event)
}

// Promisified wrapper for EXIF extraction
const getExifData = (Buffer) => {
  return new Promise((resolve, reject) => {
    new ExifImage({ image : Buffer }, function (error, exifData) {
      if (error)
        reject(error)
      else
        resolve(exifData)
    })
  })
}

// Promisified wrapper for Sharp
const getResizeBuffer = (inBuffer, x, y) => {
  return new Promise((resolve, reject) => {
    const promise1 = sharp(inBuffer)
    .resize(x, y)
    .toBuffer((err, outputBuffer, info) => {
      if (err) 
        reject(err)
      else
        resolve(outputBuffer)
    })
  })
}

const processEvent = async (event) => {
  const params = {
    Bucket: event.detail.bucket,
    Key: event.detail.key
  }

  // Get original object
  const s3Object = await s3.getObject(params).promise()

  // Get base object name
  const outputBaseName = params.Key.split('.')[0]

  // Create/save tile version
  const tileBuffer = await getResizeBuffer(s3Object.Body, 400, 400)

  await s3.putObject({
    Bucket: process.env.OutputBucket,
    Key: `${outputBaseName}-tile.jpg`,
    ContentType: 'image/jpeg',
    Body: tileBuffer,
    ACL: 'public-read'
  }).promise()

  event.tileURL = `https://${process.env.OutputBucket}.s3.amazonaws.com/${outputBaseName}-tile.jpg`

  // Create/save scaled smaller version
  const scaledBuffer = await getResizeBuffer(s3Object.Body, 600)

  await s3.putObject({
    Bucket: process.env.OutputBucket,
    Key: `${outputBaseName}-scaled.jpg`,
    ContentType: 'image/jpeg',
    Body: scaledBuffer,
    ACL: 'public-read'
  }).promise()
  event.scaledURL = `https://${process.env.OutputBucket}.s3.amazonaws.com/${outputBaseName}-scaled.jpg`

  // Extract/save EXIF data
  try {
    const EXITdata = await getExifData(s3Object.Body)

    await s3.putObject({
      Bucket: process.env.OutputBucket,
      Key: `${outputBaseName}-exif.json`,
      ContentType: 'application/json',
      Body: JSON.stringify(EXITdata)
    }).promise()

  } catch (err) {
    console.error('Exif error: ', err)
  }
  return event
}
