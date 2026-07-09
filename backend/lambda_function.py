import json
import boto3
import uuid
import os
from datetime import datetime

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


def create_response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
        },
        "body": json.dumps(body)
    }


def lambda_handler(event, context):
    try:
        method = event.get("requestContext", {}).get("http", {}).get("method", "")

        if method == "OPTIONS":
            return create_response(200, {"message": "CORS successful"})

        if method == "POST":
            body = json.loads(event.get("body", "{}"))

            food_name = body.get("foodName", "").strip()
            quantity = body.get("quantity", "").strip()
            location = body.get("location", "").strip()

            if not food_name or not quantity or not location:
                return create_response(400, {
                    "message": "foodName, quantity and location are required"
                })

            item = {
                "listingId": str(uuid.uuid4()),
                "foodName": food_name,
                "quantity": quantity,
                "location": location,
                "expiryTime": body.get("expiryTime", "").strip(),
                "donorName": body.get("donorName", "").strip(),
                "contactNumber": body.get("contactNumber", "").strip(),
                "status": "Available",
                "createdAt": datetime.utcnow().isoformat()
            }

            table.put_item(Item=item)

            return create_response(201, {
                "message": "Food listing added successfully",
                "item": item
            })

        if method == "GET":
            result = table.scan()
            items = result.get("Items", [])

            return create_response(200, {
                "message": "Food listings retrieved successfully",
                "count": len(items),
                "items": items
            })

        return create_response(405, {
            "message": "Method not allowed"
        })

    except Exception as error:
        return create_response(500, {
            "message": "Internal server error",
            "error": str(error)
        })