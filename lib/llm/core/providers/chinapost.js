// import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import BaseClient from './base.js';

/**
 * 阿里百炼 Provider
 * 使用 createOpenAICompatible 来支持 providerOptions
 * 参考: https://github.com/vercel/ai/issues/6037
 */
class ChinaPostClient extends BaseClient {
    constructor(config) {
        super(config);
        // 使用 createOpenAICompatible，name 必须设置为 'qwen' 才能使 providerOptions.qwen 生效
        // this.qwen = createOpenAICompatible({
        //     name: 'qwen',
        //     apiKey: this.apiKey,
        //     baseURL: this.endpoint
        // });
        this.china_post_model = {

        }
    }

    _getModel() {
        return this.qwen(this.model);
    }

    /**
     * 重写 chat 方法，直接调用阿里百炼 API
     * 支持 enable_thinking 参数
     */
    async chat(messages, options = {}) {
        // 构建请求体
        const requestBody = {
            model: this.model,
            messages: this._convertJson(messages),
            temperature: options.temperature || this.modelConfig.temperature,
            top_p: options.topP !== undefined ? options.topP : options.top_p || this.modelConfig.top_p,
            max_tokens: options.max_tokens || this.modelConfig.max_tokens,
            enable_thinking: options.enable_thinking !== undefined ? options.enable_thinking : false
        };

        try {
            const response = await fetch(`${this.endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`阿里百炼 API 调用失败: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // 转换为 AI SDK 格式
            return {
                text: data.choices[0]?.message?.content || '',
                finishReason: data.choices[0]?.finish_reason || 'stop',
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                }
            };
        } catch (error) {
            console.error('阿里百炼 API 调用错误:', error);
            throw error;
        }
    }
}

module.exports = AlibailianClient;
