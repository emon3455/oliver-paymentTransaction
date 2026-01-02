#!/usr/bin/env python3
"""Customize all edge test script.js files from demo template"""
import os
import re

CLASSES = {
    'cart': {'name': 'Cart', 'item': 'Cart Item', 'items': 'cart items'},
    'wishlist': {'name': 'Wishlist', 'item': 'Wishlist Item', 'items': 'wishlist items'},
    'coupon': {'name': 'Coupon', 'item': 'Coupon', 'items': 'coupons'},
    'subscriptions': {'name': 'Subscriptions', 'item': 'Subscription', 'items': 'subscriptions'},
    'transactions': {'name': 'Transactions', 'item': 'Transaction', 'items': 'transactions'},
    'gateway-1': {'name': 'Gateway 1', 'item': 'Gateway 1 Item', 'items': 'gateway 1 items'},
    'gateway-2': {'name': 'Gateway 2', 'item': 'Gateway 2 Item', 'items': 'gateway 2 items'},
    'media': {'name': 'Media', 'item': 'Media Item', 'items': 'media items'},
    'products': {'name': 'Products', 'item': 'Product', 'items': 'products'},
    'orders': {'name': 'Orders', 'item': 'Order', 'items': 'orders'}
}

def customize_file(class_key, config):
    import os
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    demo_path = os.path.join(base_dir, 'edge-tests-demo', 'script.js')
    target_path = os.path.join(base_dir, f'edge-tests-{class_key}', 'script.js')
    
    with open(demo_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replacements
    content = content.replace('Demo Class', f"{config['name']} Class")
    content = content.replace('"demo"', f'"{class_key}"')
    content = content.replace('/demo', f'/{class_key}')
    content = content.replace('EdgeTestsDemo', f"EdgeTests{config['name'].replace(' ', '')}")
    content = content.replace('[Edge Tests Demo]', f"[Edge Tests {config['name']}]")
    content = content.replace('Demo Item', config['item'])
    content = content.replace('demo item', config['item'].lower())
    content = content.replace('demo items', config['items'])
    content = content.replace('Demo Items', config['items'].title())
    
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Customized {target_path}")

if __name__ == '__main__':
    for class_key, config in CLASSES.items():
        customize_file(class_key, config)
    print("\n✅ All files customized!")

