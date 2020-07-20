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

/* Expected input event format:
  {
    Input: {
      version: '0',
      id: '8a9b22f9-1234-1234-1234-b2757fac8db3',
      'detail-type': 'uploadComplete',
      source: 'custom.happyPath',
      account: '123456789012',
      time: '2020-07-03T15:45:46Z',
      region: 'us-east-1',
      resources: [],
      detail: {
        bucket: 'happy-path-upload',
        key: 'ChIJKU9_ejHA4okRTMnj1DSlZlg/afc10693-1234-1234-1234-da02c8af2173.jpg'
      }
    }
  }
*/

const AWS = require('aws-sdk')
AWS.config.update({region: process.env.AWS_REGION})
const documentClient = new AWS.DynamoDB.DocumentClient()

// Standard Lambda handler
exports.handler = async (event) => {
  console.log(event)
  await publishItem(event.Input)
}

// Update the item state in in DynamoDB 
const publishItem = async (event) => {

  const key = event.detail.key.split('/')[1]
  const type = key.split('.')[1]
  const log = JSON.stringify(event)

  // Update the workflow item
  const result = await documentClient.update({
    TableName: process.env.TableName,
    Key:{
      "PK": 'workflow',
      "SK": event.detail.ID
    },
    UpdateExpression: "set objStatus = :newStatus, eventLog = :eventLog",
    ExpressionAttributeValues:{
        ":newStatus": "PROCESSED",
        ":eventLog": log
    },
    ReturnValues:"ALL_NEW"
  }).promise()
  console.log(result)

  // Add to placeId resources

  console.log(await documentClient.put({
    TableName: process.env.TableName,
    Item: {
      PK: result.Attributes.placeId,
      SK: result.Attributes.SK,
      type,
      created: Date.now(),
      tileURL: event.tileURL,
      scaledURL: event.scaledURL
    }
  }).promise())
}
