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

'use strict'

const AWS = require('aws-sdk')
AWS.config.region = process.env.AWS_REGION
const iotdata = new AWS.IotData({ endpoint: process.env.IOT_DATA_ENDPOINT })

// The standard Lambda handler
exports.handler = async (event) => {
  console.log (JSON.stringify(event, null, 2))

  await Promise.all(
    event.Records.map(async (record) => {
      try {
        if (!record.dynamodb.NewImage) return  // Deletion

        const data = record.dynamodb.NewImage

        // This function only handles workflow completions
        if (data.PK.S === 'workflow') {
          if (data.objStatus.S === 'REJECTED') {
            console.log('Item rejection')
            const iotTopic = data.placeId.S 
            data.result = 'REJECTED'
            await iotPublish(iotTopic, data)         
          }
        }
        if (data.PK.S != 'workflow' && data.SK.S != 'listing') {
          console.log('Item processed')
          const iotTopic = data.PK.S 
          data.result = 'PROCESSED'
          await iotPublish(iotTopic, data)         
        }
      } catch (err) {
        console.error('Error: ', err)
      }
    })
  )
}

// Publishes the message to the IoT topic
const iotPublish = async function (topic, message) {
  console.log('iotPublish: ', topic, message)
  try {
      await iotdata.publish({
          topic,
          qos: 0,
          payload: JSON.stringify(message)
      }).promise();
      console.log('iotPublish success to topic: ', topic, message)
  } catch (err) {
      console.error('iotPublish error:', err)
  }
}

