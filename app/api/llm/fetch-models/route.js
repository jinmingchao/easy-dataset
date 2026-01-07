import { NextResponse } from 'next/server';
import axios from 'axios';
import { CUSTOM_MODEL_CONFIG } from '@/constant/global_const';

// 从模型提供商获取模型列表
export async function POST(request) {
  console.log("调用 /api/llm/fetch-models - request: \n %o",request);
  const chinapostProviderIds = new Set([
    CUSTOM_MODEL_CONFIG.CHINAPOST_QWEN25VL_PROVIDERID,
    CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_PROVIDERID
  ])
  try {
    const { endpoint, providerId, apiKey } = await request.json();
    console.log("/api/llm/fetch-models - endpoint: \n %o",endpoint);
    console.log("/api/llm/fetch-models - providerId: \n %o",providerId);
    console.log("/api/llm/fetch-models - apiKey: \n %o",apiKey);
    if (!endpoint) {
      return NextResponse.json({ error: '缺少 endpoint 参数' }, { status: 400 });
    }

    let url = endpoint.replace(/\/$/, ''); // 去除末尾的斜杠

    // 处理 Ollama endpoint
    if (providerId === 'ollama') {
      // 移除可能存在的 /v1 或其他版本前缀
      url = url.replace(/\/v\d+$/, '');

      // 如果 endpoint 不包含 /api，则添加
      if (!url.includes('/api')) {
        url += '/api';
      }
      url += '/tags';
    } else if (chinapostProviderIds.has(providerId)) {
      //doNothing
    } else {
      url += '/models';
    }
    let response = null
    if (chinapostProviderIds.has(providerId)) {
      //doNothing
    } else {
      const headers = {};
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      response = await axios.get(url, { headers });
      console.log("/api/llm/fetch-models - response: \n %o",response);
    }

    // 根据不同提供商格式化返回数据
    let formattedModels = [];
    if (providerId === 'ollama') {
      // Ollama /api/tags 返回的格式: { models: [{ name: 'model-name', ... }] }
      if (response !== null && response.data.models && Array.isArray(response.data.models)) {
        formattedModels = response.data.models.map(item => ({
          modelId: item.name,
          modelName: item.name,
          providerId
        }));
      }
    } else if (chinapostProviderIds.has(providerId)) {
      switch (providerId) {
        case CUSTOM_MODEL_CONFIG.CHINAPOST_QWEN25VL_PROVIDERID:
          formattedModels.push({
            modelId: CUSTOM_MODEL_CONFIG.CHINAPOST_QWEN25VL_MODELNAME,
            modelName: CUSTOM_MODEL_CONFIG.CHINAPOST_QWEN25VL_MODELNAME,
            providerId: CUSTOM_MODEL_CONFIG.CHINAPOST_QWEN25VL_PROVIDERID
          })
          break;
        case CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_PROVIDERID:
          formattedModels.push({
            modelId: CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_QWEN3_14B_MODELID,
            modelName: CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_QWEN3_14B_MODELNAME,
            providerId: CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_PROVIDERID
          })
          break;
        default:
          return NextResponse.json(
              { error: `中国邮政大模型 - 获取模型列表失败: 未找到供应商id` },
              { status: error.response.status }
          );

      }

    } else {
      // 默认处理方式（適用于 OpenAI 等）
      if (response !== null && response.data.data && Array.isArray(response.data.data)) {
        formattedModels = response.data.data.map(item => ({
          modelId: item.id,
          modelName: item.id,
          providerId
        }));
      }
    }
    console.log("/api/llm/fetch-models - formattedModels: \n %o",formattedModels);
    return NextResponse.json(formattedModels);
  } catch (error) {
    console.error('获取模型列表失败:', String(error));

    // 处理特定错误
    if (error.response) {
      if (error.response.status === 401) {
        return NextResponse.json({ error: 'API Key 无效' }, { status: 401 });
      }
      return NextResponse.json(
        { error: `获取模型列表失败: ${error.response.statusText}` },
        { status: error.response.status }
      );
    }

    return NextResponse.json({ error: `获取模型列表失败: ${error.message}` }, { status: 500 });
  }
}
