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

const AWS = require('aws-sdk')
AWS.config.update({region: process.env.AWS_REGION})
const documentClient = new AWS.DynamoDB.DocumentClient()

// Save place info to database

exports.handler = async (event) => {
  // console.log(JSON.stringify(event, null, 0))

  if (!event.body) {
    return {
      statusCode: 422,
      body: JSON.stringify("Missing body")
    }
  }

  const body = JSON.parse(event.body)
  const Item = {
    PK: body.place_id,
    SK: "listing",
    name: body.name,
    type: body.type,
    lat: body.lat,
    lng: body.lng,
    vicinity: body.vicinity,
    created: event.requestContext.timeEpoch
  }

  const result = await documentClient.put({
    TableName: process.env.TableName,
    Item
  }).promise()
  console.log(result)

  return {
    statusCode: 200,
    body: JSON.stringify(Item)
  }
}