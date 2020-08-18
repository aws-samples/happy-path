# Happy Path - Building flexible serverless backends for web apps 

This example application shows how to build flexible serverless backends for web apps. This sample application is called *Happy Path*.

This app is designed to help state parks and nonprofit organizations digitalize printed materials, such as flyers and maps. It allows visitors to capture images of documents and photos of hiking trails. They can share these with other users to reduce printed waste.

The frontend displays and captures images for different locations, and the backend processes this data according to a set of business rules. This web application is designed for smartphones so it’s used while visitors are at the locations. 

To learn more about how this application works, see the 3-part series on the AWS Compute Blog: https://aws.amazon.com/blogs/compute/using-serverless-backends-to-iterate-quickly-on-web-apps-part-1/.

Important: this application uses various AWS services and there are costs associated with these services after the Free Tier usage - please see the [AWS Pricing page](https://aws.amazon.com/pricing/) for details. You are responsible for any AWS costs incurred. No warranty is implied in this example.

```bash
.
├── README.MD                   <-- This instructions file
├── frontend                    <-- Source code for the Vue.js
├── backend                     <-- Source code for the serverless backend
├── workflows                   <-- Step Functions applications
├── localTesting                <-- Test harness/test events for local debugging
```

## Requirements

* AWS CLI already configured with Administrator permission
* [AWS SAM CLI installed](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) - **minimum version 0.48**.
* [NodeJS 12.x installed](https://nodejs.org/en/download/)
* [Vue.js and Vue CLI installed](https://vuejs.org/v2/guide/installation.html)
* [Google Maps API key](https://developers.google.com/maps/documentation/javascript/get-api-key)
* Sign up for an [Auth0 account](https://auth0.com/)

## Auth0 configuration

1. Sign up for an Auth0 account at https://auth0.com.
2. Select Applications from the menu, then choose **Create Application**.
3. Enter the name *Happy Path* and select *Single Page Web Applications* for application type. Choose **Create**.
4. Select the *Settings* tab, and note the `Domain` and `ClientID` for installation of the application backend and frontend.
5. Under *Allowed Callback URLs*, *Allowed Logout URLs* and *Allowed Web Origins* and *Allowed Origins (CORS)*, enter **http://localhost:8080**. Choose **Save Changes**.
6. Select APIS from the menu, then choose **Create API**.
7. Enter the name *Happy Path*, and set the *Identifier* to **https://auth0-jwt-authorizer**. Choose **Create**.

Auth0 is now configured for you to use. The backend uses the `domain` value to validate the JWT token. The frontend uses the identifier (also known as the audience), together with the *Client ID* to validate authentication for this single application. For more information, see the [Auth0 documentation](https://auth0.com/docs/api/authentication).

## Installation Instructions

1. [Create an AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) if you do not already have one and login.

2. Clone the repo onto your local development machine:
```
git clone https://github.com/aws-samples/happy-path
```

### 1. Installing the realtime stack

1. From the command line, install the realtime messaging stack:
```
cd backend
sam deploy --guided --template-file realtime.yaml
```
During the prompts, enter `happy-path-realtime` for the Stack Name, enter your preferred Region, and accept the defaults for the remaining questions. 

2. Retrieve the IoT endpointAddress - note this for the frontend installation:
```
aws iot describe-endpoint --endpoint-type iot:Data-ATS
```
3. Retrieve the Cognito Pool ID - note this for the frontend installation:
```
aws cognito-identity list-identity-pools --max-results 10
```

### 2. Create the Lambda layer

Note that you must run these instructions on a Linux x64 platform to ensure the correct Sharp binaries are included. If you are using another operating system, see the [AWS Lambda Sharp installation instructions](https://sharp.pixelplumbing.com/install#aws-lambda). Alternatively, use [AWS Cloud9](https://aws.amazon.com/cloud9/) to complete this step to ensure compatibility.

1. Change to the layer directory:
```
cd ./backend/layers/sharp-layer
```
2. Install and prepare package:
```
npm install
mkdir -p ./layer/nodejs 
mv ./node_modules ./layer/nodejs
```
3. Deploy the SAM template to create the layer:
```
sam deploy --guided
```
4. When prompted for parameters, enter:
- Stack Name: lambda-layer-sharp
- AWS Region: your preferred AWS Region (e.g. us-east-1)
- Accept all other defaults.

Take a note of the output ARN - it is used in subsequent deployments wherever you see the `SharpLayerARN` parameter.

### 3. Installing the backend application

From the command line, deploy the SAM template. Note that your SAM version must be at least 0.48 - if you receive build errors, it is likely that your SAM CLI version is not up to date. 
Run:

```
cd ../.. 
sam build
sam deploy --guided
```

When prompted for parameters, enter:
- Stack Name: happy-path-backend
- AWS Region: your preferred AWS Region (e.g. us-east-1)
- ApplicationTableName: leave as default
- S3UploadBucketName: enter a unique name for your bucket. 
- S3DistributionBucketName: enter a unique name for your bucket.
- IoTDataEndpoint: the IoT endpointAddress noted in the realtime stack installation.
- Auth0issuer: this is the URL for the Auth0 account (the format is https://dev-abc12345.auth0.com/).
- Accept all other defaults.

This takes several minutes to deploy. At the end of the deployment, note the output values, as you need these in the frontend installation.

### 4. Installing the frontend application

The frontend code is saved in the `frontend` subdirectory. 

1. Before running, you need to set environment variables in the `src\main.js` file:

- GoogleMapsKey: [sign up](https://developers.google.com/maps/documentation/javascript/get-api-key) for a Google Maps API key and enter the value here.
- APIurl: this is the `APIendpoint` value from the last section.
- PoolId: your Cognito pool ID from earlier.
- Host: your IoT endpoint from earlier.
- Region: your preferred AWS Region (e.g. us-east-1).

2. Open the `src\auth_config.json` and enter the values from your Auth0 account:
- domain: this is your account identifier, in the format `dev-12345678.auth0.com`.
- clientId: a unique string identifying the client application.
- audience: set to https://auth0-jwt-authorizer.

3. Change directory into the frontend code, and run the NPM installation:

```
cd ../frontend
npm install
```
4. After installation is complete, you can run the application locally:

```
npm run serve
```

### 5. Installing the workflows

To show the progression of increasingly complex workflows, this repo uses four separate AWS Step Functions state machines. Part 3 of the blog series shows how to deploy each one. The deployment pattern is the same for each version.

- Workflow SAM templates are in `workflows/templates`.
- State machine definitions are stored in `workflows/state machines`.

To deploy:
1. Remove any previous workflow version by deleting their CloudFormation stack.
2. Change directory to the version of the workflow you want to deploy, e.g.:
```
cd workflows/templates/v1
```
3. Build and deploy:
```
sam build
sam deploy --guided
```
4. When prompted for parameters, enter the parameters noted as outputs in the previous deployments.

## Next steps

[A sample photo dataset](https://jbesw-public-downloads.s3.us-east-2.amazonaws.com/happy-path-photos-dataset.zip) is provided for download. These photos are provided by the blog author ([James Beswick](https://twitter.com/jbesw)) under the [Creative Commons Attribution 4.0 International license](http://creativecommons.org/licenses/by/4.0/).

The AWS Compute Blog series and video link at the top of this README file contains additional information about the application design and architecture.

If you have any questions, please contact the author or raise an issue in the GitHub repo.

==============================================

Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.

SPDX-License-Identifier: MIT-0
