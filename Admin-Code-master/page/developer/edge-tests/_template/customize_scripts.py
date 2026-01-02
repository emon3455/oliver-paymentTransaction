#!/usr/bin/env python3
"""
Script to customize edge test script.js files from demo template
"""
import os
import re

# Class configurations
CLASSES = {
    'cart': {
        'name': 'Cart',
        'config_key': 'cart',
        'endpoint_base': '/cart',
        'id_field': 'cartId',
        'scenarios': {
            '1': {'title': 'Create Cart Item', 'endpoint': '/cart/create', 'payload': {'userId': 'user-123', 'productId': 'prod-1', 'quantity': 2}},
            '2': {'title': 'Get Cart by User ID', 'endpoint': '/cart/user/{userId}', 'input': [{'type': 'text', 'id': 'userId', 'label': 'User ID'}]},
            '3': {'title': 'Get Cart Items by Status', 'endpoint': '/cart/list', 'input': [{'type': 'select', 'id': 'status', 'label': 'Status', 'options': ['active', 'pending', 'completed']}]},
            '4': {'title': 'Update Cart Item', 'endpoint': '/cart/update/{cartId}', 'payload': {'quantity': 3}, 'input': [{'type': 'text', 'id': 'cartId', 'label': 'Cart ID'}]}
        }
    },
    'wishlist': {
        'name': 'Wishlist',
        'config_key': 'wishlist',
        'endpoint_base': '/wishlist',
        'id_field': 'wishlistId',
    },
    'coupon': {
        'name': 'Coupon',
        'config_key': 'coupon',
        'endpoint_base': '/coupon',
        'id_field': 'couponId',
    },
    'subscriptions': {
        'name': 'Subscriptions',
        'config_key': 'subscriptions',
        'endpoint_base': '/subscriptions',
        'id_field': 'subscriptionId',
    },
    'transactions': {
        'name': 'Transactions',
        'config_key': 'transactions',
        'endpoint_base': '/transactions',
        'id_field': 'transactionId',
    },
    'gateway-1': {
        'name': 'Gateway 1',
        'config_key': 'gateway-1',
        'endpoint_base': '/gateway-1',
        'id_field': 'gatewayId',
    },
    'gateway-2': {
        'name': 'Gateway 2',
        'config_key': 'gateway-2',
        'endpoint_base': '/gateway-2',
        'id_field': 'gatewayId',
    },
    'media': {
        'name': 'Media',
        'config_key': 'media',
        'endpoint_base': '/media',
        'id_field': 'mediaId',
    },
    'products': {
        'name': 'Products',
        'config_key': 'products',
        'endpoint_base': '/products',
        'id_field': 'productId',
    },
    'orders': {
        'name': 'Orders',
        'config_key': 'orders',
        'endpoint_base': '/orders',
        'id_field': 'orderId',
    }
}

def customize_script(class_name, config):
    """Customize script.js for a class"""
    demo_path = 'page/developer/edge-tests-demo/script.js'
    target_path = f'page/developer/edge-tests-{class_name}/script.js'
    
    with open(demo_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replacements
    replacements = [
        ('Demo Class', f"{config['name']} Class"),
        ('demo functionality', f"{config['name'].lower()} functionality"),
        ('demo', config['config_key']),
        ('Demo', config['name']),
        ('/demo', config['endpoint_base']),
        ('EdgeTestsDemo', f"EdgeTests{config['name'].replace(' ', '')}"),
        ('[Edge Tests Demo]', f"[Edge Tests {config['name']}]"),
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    # Handle userId -> id_field replacement in testScenario function
    if config['id_field'] != 'userId':
        content = re.sub(r'inputValues\.userId', f"inputValues.{config['id_field']}", content)
        content = re.sub(r'\{userId\}', f"{{{config['id_field']}}}", content)
    
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Customized {target_path}")

if __name__ == '__main__':
    for class_name, config in CLASSES.items():
        customize_script(class_name, config)

