import json
import uuid
import os
from datetime import datetime

import boto3
from boto3.dynamodb.conditions import Attr

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(os.environ["TABLE_NAME"])


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
        },
        "body": json.dumps(body)
    }


def lambda_handler(event, context):

    method = event.get("requestContext", {}) \
                  .get("http", {}) \
                  .get("method", event.get("httpMethod", ""))

    # Handle CORS
    if method == "OPTIONS":
        return response(200, {"message": "CORS OK"})

    # -------------------------
    # GET FOOD LISTINGS
    # -------------------------
    if method == "GET":

        try:
            result = table.scan(
                FilterExpression=Attr("status").eq("Available")
            )

            items = result.get("Items", [])

            items.sort(
                key=lambda x: x.get("createdAt", ""),
                reverse=True
            )

            return response(200, items)

        except Exception as e:
            return response(500, {
                "message": str(e)
            })

    # -------------------------
    # POST NEW FOOD
    # -------------------------
    if method == "POST":

        try:

            body = json.loads(event.get("body", "{}"))

            required_fields = [
                "foodName",
                "quantity",
                "location",
                "expiryTime",
                "donorName",
                "contactNumber"
            ]

            missing = [
                field
                for field in required_fields
                if not body.get(field)
            ]

            if missing:
                return response(400, {
                    "message":
                        "Missing required fields: "
                        + ", ".join(missing)
                })

            item = {
                "listingId": str(uuid.uuid4()),
                "foodName": body["foodName"],
                "quantity": body["quantity"],
                "location": body["location"],
                "expiryTime": body["expiryTime"],
                "donorName": body["donorName"],
                "contactNumber": body["contactNumber"],
                "status": "Available",
                "createdAt": datetime.utcnow().isoformat()
            }

            table.put_item(Item=item)

            return response(201, {
                "message": "Food listing added successfully.",
                "listingId": item["listingId"]
            })

        except Exception as e:
            return response(500, {
                "message": str(e)
            })

    # -------------------------
    # METHOD NOT ALLOWED
    # -------------------------
    return response(405, {
        "message": "Method Not Allowed"
    })
