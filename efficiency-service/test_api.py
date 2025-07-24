#!/usr/bin/env python3
"""
简单的API测试脚本，用于检查personal_dashboard_real.html的数据获取
"""

import requests
import json
import time

def test_raw_stats_api():
    """测试raw-stats API端点"""
    print("🔍 测试 ISS 标注效率 API 端点...")
    
    # 测试URL
    test_url = "http://localhost:8001/api/v1/events/raw-stats/temp_user_001?days=30"
    
    try:
        print(f"📡 请求URL: {test_url}")
        
        # 发送请求
        response = requests.get(test_url, timeout=10)
        
        print(f"📊 响应状态码: {response.status_code}")
        print(f"📏 响应内容长度: {len(response.content)} bytes")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print("✅ 成功获取JSON数据")
                print("📈 数据概览:")
                print(f"  - 总事件数: {data.get('total_events', 'N/A')}")
                print(f"  - 事件分布: {data.get('event_distribution', {})}")
                print(f"  - 平均FPS: {data.get('avg_fps', 'N/A')}")
                print(f"  - 数据来源: {data.get('data_source', 'unknown')}")
                print(f"  - 最后更新: {data.get('last_updated', 'N/A')}")
                
                # 完整数据结构
                print("\n📋 完整响应数据:")
                print(json.dumps(data, indent=2, ensure_ascii=False))
                
                return True
                
            except json.JSONDecodeError as e:
                print(f"❌ JSON解析失败: {e}")
                print(f"原始响应: {response.text[:200]}...")
                return False
        else:
            print(f"❌ API请求失败，状态码: {response.status_code}")
            print(f"错误响应: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ 网络请求异常: {e}")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False

def test_iss_analysis_api():
    """测试ISS分析API端点"""
    print("\n🎯 测试 ISS 分析 API 端点...")
    
    test_url = "http://localhost:8001/api/v1/events/iss-analysis/temp_user_001?days=30"
    
    try:
        response = requests.get(test_url, timeout=10)
        print(f"📊 ISS分析API状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ ISS分析数据获取成功")
            print(f"  - 总分析事件: {data.get('total_events_analyzed', 'N/A')}")
            print(f"  - 多边形分析: {data.get('polygon_annotation', {})}")
            print(f"  - 帧分析: {data.get('frame_annotation', {})}")
            return True
        else:
            print(f"❌ ISS分析API失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ISS分析API异常: {e}")
        return False

def test_dashboard_accessibility():
    """测试仪表板页面可访问性"""
    print("\n🌐 测试仪表板页面可访问性...")
    
    dashboard_url = "http://localhost:8001/examples/personal_dashboard_real.html"
    
    try:
        response = requests.get(dashboard_url, timeout=5)
        print(f"📊 仪表板页面状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ 仪表板页面可正常访问")
            print(f"  - 页面大小: {len(response.content)} bytes")
            
            # 检查页面是否包含关键内容
            content = response.text
            if "ISS 标注效率深度分析" in content:
                print("✅ 页面包含ISS分析标题")
            if "raw-stats" in content:
                print("✅ 页面包含API调用代码")
            
            return True
        else:
            print(f"❌ 仪表板页面无法访问: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ 仪表板页面访问异常: {e}")
        return False

if __name__ == "__main__":
    print("🚀 开始测试 ISS 标注效率监控系统...")
    print("=" * 60)
    
    # 测试服务连通性
    try:
        health_response = requests.get("http://localhost:8001/health", timeout=5)
        if health_response.status_code == 200:
            print("✅ 效率监控服务运行正常")
        else:
            print("⚠️ 效率监控服务状态异常")
    except:
        print("❌ 效率监控服务无法连接")
        exit(1)
    
    print("-" * 60)
    
    # 执行测试
    test_results = []
    
    test_results.append(test_raw_stats_api())
    test_results.append(test_iss_analysis_api()) 
    test_results.append(test_dashboard_accessibility())
    
    print("\n" + "=" * 60)
    print("📊 测试结果汇总:")
    
    passed = sum(test_results)
    total = len(test_results)
    
    print(f"✅ 通过: {passed}/{total}")
    print(f"❌ 失败: {total - passed}/{total}")
    
    if passed == total:
        print("🎉 所有测试通过！ISS 标注效率仪表板应该可以正常工作。")
    else:
        print("⚠️ 部分测试失败，可能影响仪表板功能。")
    
    print(f"\n🌐 请访问: http://localhost:8001/examples/personal_dashboard_real.html")
    print("查看ISS标注效率分析仪表板") 