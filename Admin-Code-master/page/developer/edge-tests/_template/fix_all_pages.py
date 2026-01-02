#!/usr/bin/env python3
"""Fix all edge test pages - copy style.css and customize script.js"""
import os
import shutil

# Get the base directory
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CLASSES = {
    'wishlist': {'name': 'Wishlist', 'item': 'Wishlist Item', 'items': 'wishlist items', 'id_field': 'wishlistId'},
    'coupon': {'name': 'Coupon', 'item': 'Coupon', 'items': 'coupons', 'id_field': 'couponId'},
    'subscriptions': {'name': 'Subscriptions', 'item': 'Subscription', 'items': 'subscriptions', 'id_field': 'subscriptionId'},
    'transactions': {'name': 'Transactions', 'item': 'Transaction', 'items': 'transactions', 'id_field': 'transactionId'},
    'gateway-1': {'name': 'Gateway 1', 'item': 'Gateway 1 Item', 'items': 'gateway 1 items', 'id_field': 'gatewayId'},
    'gateway-2': {'name': 'Gateway 2', 'item': 'Gateway 2 Item', 'items': 'gateway 2 items', 'id_field': 'gatewayId'},
    'media': {'name': 'Media', 'item': 'Media Item', 'items': 'media items', 'id_field': 'mediaId'},
    'products': {'name': 'Products', 'item': 'Product', 'items': 'products', 'id_field': 'productId'},
    'orders': {'name': 'Orders', 'item': 'Order', 'items': 'orders', 'id_field': 'orderId'}
}

def customize_script(class_key, config):
    demo_script = os.path.join(base_dir, 'edge-tests-demo', 'script.js')
    target_script = os.path.join(base_dir, f'edge-tests-{class_key}', 'script.js')
    
    with open(demo_script, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replacements
    replacements = [
        ('Demo Class', f"{config['name']} Class"),
        ('demo/template', f"{config['name'].lower()} functionality"),
        ('"demo"', f'"{class_key}"'),
        ("'demo'", f"'{class_key}'"),
        ('/demo', f'/{class_key}'),
        ('EdgeTestsDemo', f"EdgeTests{config['name'].replace(' ', '')}"),
        ('[Edge Tests Demo]', f"[Edge Tests {config['name']}]"),
        ('Demo Item', config['item']),
        ('demo item', config['item'].lower()),
        ('demo items', config['items']),
        ('Demo Items', config['items'].title()),
        ('{userId}', '{' + config['id_field'] + '}'),
    ]
    
    for old, new in replacements:
        content = content.replace(old, new)
    
    # Special handling for userId in testScenario function
    if config['id_field'] != 'userId':
        content = content.replace('inputValues.userId', f"inputValues.{config['id_field']}")
        content = content.replace("'userId'", f"'{config['id_field']}'")
    
    with open(target_script, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Customized {target_script}")

def copy_style(class_key):
    demo_style = os.path.join(base_dir, 'edge-tests-demo', 'style.css')
    target_style = os.path.join(base_dir, f'edge-tests-{class_key}', 'style.css')
    
    # Update the header comment
    with open(demo_style, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('Demo Class (Template)', f"{CLASSES[class_key]['name']} Class")
    
    with open(target_style, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Copied style.css to {target_style}")

if __name__ == '__main__':
    print("Customizing all edge test pages...\n")
    for class_key, config in CLASSES.items():
        customize_script(class_key, config)
        copy_style(class_key)
    print("\n✅ All pages customized!")

