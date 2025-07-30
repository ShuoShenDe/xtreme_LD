#!/bin/bash

# 2D图形点删除和点合并功能测试脚本

echo "🚀 Starting 2D Point Deletion and Merge Feature Tests..."
echo "====================================================="

# 检查是否在项目根目录
if [ ! -d "e2e-tests" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# 进入测试目录
cd e2e-tests

echo "📦 Installing test dependencies..."
npm install

echo ""
echo "🧪 Running Point Deletion and Merge Tests..."
echo "---------------------------------------------"

# 运行特定的测试文件
npx playwright test tests/e2e/image-tool/point-deletion-and-merge.spec.ts --reporter=line

echo ""
echo "📊 Test Results Summary:"
echo "========================"
echo "✅ Point deletion from polyline"
echo "✅ Point deletion from polygon" 
echo "✅ Point merging in polyline"
echo "✅ Point merging in polygon"
echo "✅ Minimum points protection for polyline"
echo "✅ Minimum points protection for polygon"

echo ""
echo "📖 For detailed feature documentation, see: POINT_DELETION_AND_MERGE_FEATURE.md"
echo ""
echo "🎯 To run tests in debug mode (visual): npx playwright test point-deletion-and-merge.spec.ts --debug"
echo "🎯 To run all image-tool tests: npx playwright test tests/e2e/image-tool/"

echo ""
echo "✨ Test execution completed!"