# ShareBite Professional Frontend

This package upgrades the original one-page site into a multi-page application with Cognito registration, email verification, sign-in, session protection, dashboard, browse page, expanded listing form, photo preview, profile/messages/privacy pages and removal of the public phone-number field.

## Already configured
- Cognito region: us-east-1
- User pool: us-east-1_E821lVBP6
- App client: 35jha69rngm1t53cv8hjautk3q
- Existing API endpoint retained
- Amplify URL retained

## Still required in AWS
1. Add a Cognito authorizer to API Gateway and require it on protected routes.
2. Add an S3 presigned upload endpoint; save imageUrl/imageKey in DynamoDB.
3. Update Lambda to derive ownerUserId from the verified token rather than trusting the browser body.
4. Add ownership-filtered My Listings endpoint.
5. Add Conversations and Messages tables/routes.
6. Add account deletion and retention workflows.

The photo chooser currently validates and previews the image. It does not permanently upload until the S3 endpoint is created.
