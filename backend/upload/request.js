/*
  Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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

'use strict'

const { v4: uuidv4 } = require('uuid')
const AWS = require('aws-sdk')
AWS.config.update({ region: process.env.AWS_REGION })
const documentClient = new AWS.DynamoDB.DocumentClient()
const s3 = new AWS.S3()

const URL_EXPIRATION_SECONDS = 60

// Main Lambda entry point
exports.handler = async (event) => {
  const result = await getUploadURL(event)
  console.log('Result: ', result)
  return result
}

const getUserId = (event) => {
  try {
    return event.requestContext.authorizer.jwt.claims.sub
  } catch (err) {
    return 'test-user'
  }
}

const getUploadURL = async function(event) {
  console.log(event)
  const actionId = uuidv4()

  if (!event.queryStringParameters) {
    return {
      statusCode: 422,
      body: JSON.stringify("Missing parameters")
    }
  }

  const placeId = event.queryStringParameters.placeId
  const key = `${actionId}.jpg`
  const userId = getUserId(event)

  // Add to DynamoDB table
  const result = await documentClient.put({
    TableName: process.env.TableName,
    Item: {
      PK: 'workflow',
      SK: actionId,
      placeId,
      userId,
      objStatus: 'PENDING_UPLOAD',
      created: Date.now()
    }
  }).promise()
  console.log(result)

  // Get signed URL from S3

  const s3Params = {
    Bucket: process.env.UploadBucket,
    Key:  `${placeId}/${actionId}.jpg`,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: 'image/jpeg'
  }

  console.log('Params: ', s3Params)
  const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params)

  return JSON.stringify({
    "uploadURL": uploadURL,
    "photoFilename": `${actionId}.jpg`
  })
}