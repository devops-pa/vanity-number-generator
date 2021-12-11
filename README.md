# Vanity Number Generator
Vanity Number Generator is a TypeScript AWS Lambda that handles Amazon Connect Task Flow events generating vanity numbers using the customer phone number. 

The number generator algorithm matches the customer phone number against a subset of the english dictionary containing words shorter than a preconfigured amount and generates 5 vanity numbers. If there are not enough matches, the function toreturns the caller phone number as a fallback.

The algorithm currently considers only the last 5 digits of the caller phone to generate vanity numbers. It attempts to detect progressively shorter words in order to increase the chance of generating a good looking number. Results are sorted in a reverse order by their word character count.

A map of caller phone numbers and generated vanity numbers is stored inside a DynamoDB table to reduce the computational cost of the solution.

The solution can be easily integrated with an existing Amazon Connect Instance by creating a new contact flow included in the solution. Please refer to the section below for more information on integrating with Amazon Connect.

## Build
```
npm i
npm run build
```

## Test
```
npm run test
```

## Deploy
You need to install [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html) to deploy the solution.
```
npm run deploy -- --region eu-west-2 --stack-name vanity-number-generator-dev
```

### Delete stack
```
npm run delete -- --region eu-west-2 --stack-name vanity-number-generator-dev
```

## Integrating with an Amazon Connect Instance
To integrate with your custom Amazon Connect Instance, you need to customize and import the [Amazon Connect Task Flow Template](./aws-connect-lambda-task-flow.json) included in this solution. 

Modify the file to use the actual ARN of the deployed Vanity Number Generator:
```json
  "parameters": [
    // ...
    {
      "name": "FunctionArn",
      "value": "<FUNCTION ARN>",
      "namespace": null
    },
    // ...
  ]
```
## Invoke using an Amazon Connect Instance
Permissions have to be explicitely defined to allow an Amazon Connect Instance to invoke Vanity Number Generator. To configure permissions, you need to define a IAM policy and attach it to the function role.

Modify the policy to use the actual ARN of the deployed Vanity Number Generator and your Amazon Connect Instance ARN.
```json
{
  "Version": "2012-10-17",
  "Id": "default",
  "Statement": [
    {
      "Sid": "InvokeLambdaFromAmazonConnect",
      "Effect": "Allow",
      "Principal": {
        "Service": "connect.amazonaws.com"
      },
      "Action": "lambda:InvokeFunction",
      "Resource": "<FUNCTION ARN>",
      "Condition": {
        "ArnLike": {
          "AWS:SourceArn": "<CONNECT INSTANCE ARN>"
        }
      }
    }
  ]
}
```

## Rodmap
1. Improve readability of the generated number by stripping the country code and splitting the numbers in readable blocks.
2. Automate the configuration of the Amazon Connect Contact Flow by using AWS SDK to invoke the create-contact-flow API.
3. Automate the configuration the IAM policy used to allow the Amazon Connect Instance to invoke the number generation lambda
4. Implement an access policy to reject calls based on caller id to minimize costs.
5. Automated regression testing using [Amazon Transcribe](https://aws.amazon.com/transcribe/).