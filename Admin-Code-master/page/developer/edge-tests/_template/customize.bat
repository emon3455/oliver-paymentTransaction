@echo off
REM Customize all edge test script.js files from demo template
cd /d "%~dp0\.."

REM Copy demo script.js to all pages
copy "edge-tests-demo\script.js" "edge-tests-wishlist\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-coupon\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-subscriptions\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-transactions\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-gateway-1\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-gateway-2\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-media\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-products\script.js" /Y
copy "edge-tests-demo\script.js" "edge-tests-orders\script.js" /Y

REM Copy demo style.css to all pages
copy "edge-tests-demo\style.css" "edge-tests-wishlist\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-coupon\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-subscriptions\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-transactions\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-gateway-1\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-gateway-2\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-media\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-products\style.css" /Y
copy "edge-tests-demo\style.css" "edge-tests-orders\style.css" /Y

echo Files copied. Now customize each script.js file manually.

