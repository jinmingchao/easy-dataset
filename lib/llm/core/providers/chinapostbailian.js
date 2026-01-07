import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import BaseClient from './base.js';
import { CUSTOM_MODEL_CONFIG } from '@/constant/global_const';
import {CONFIG_FILES} from "next/constants";

const  log_prefix = "chinapostbailian.js - "
/**
 * 阿里百炼 Provider
 * 使用 createOpenAICompatible 来支持 providerOptions
 * 参考: https://github.com/vercel/ai/issues/6037
 */
class ChinaPostBaiLianClient extends BaseClient {
    constructor(config) {
        super(config);
        // 使用 createOpenAICompatible，name 必须设置为 'qwen' 才能使 providerOptions.qwen 生效
        this.china_post_bailian_model = createOpenAICompatible({
            name: CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_QWEN3_14B_MODELNAME,
            apiKey: this.apiKey,
            baseURL: this.endpoint
        });
        // this.china_post_model = {
        //     name: 'qwen',
        //     apiKey: '',
        //     baseURL: 'http://10.1.153.200:8088/General/haproxy-othvllm/qwen72vl/v1/chat/completions?AccessCode=45BBBD2F200C862DD2C1F86368C32783'
        // }
    }

    _getModel() {
        return this.china_post_bailian_model(this.model);
    }

    convertJson(data) {

        return data.map(item => {
            // 只处理 role 为 "user" 的项
            if (item.role !== 'user') return item;

            const newItem = {
                role: 'user',
                content: null,
            };

            // 情况1：content 是字符串
            if (typeof item.content === 'string') {
                newItem.content =  item.content;
            }
            // 情况2：content 是数组
            else if (Array.isArray(item.content)) {
                if (newItem.content === null) {
                    newItem.content = []
                    newItem.experimental_attachments = []
                }
                item.content.forEach(contentItem => {
                    if (contentItem.type === 'text') {
                        // 文本内容
                        newItem.content.push({
                            type: 'text',
                            text: contentItem.text
                        });
                    } else if (contentItem.type === 'image_url') {
                        // 图片内容
                        const imageUrl = contentItem.image_url.url;

                        // 提取文件名（如果没有则使用默认名）
                        let fileName = 'image.jpg';
                        if (imageUrl.startsWith('data:')) {
                            // 如果是 base64 数据，尝试从 content type 获取扩展名
                            const match = imageUrl.match(/^data:image\/(\w+);base64/);
                            if (match) {
                                fileName = `image.${match[1]}`;
                            }
                        }

                        newItem.experimental_attachments.push({
                            url: imageUrl,
                            name: fileName,
                            contentType: imageUrl.startsWith('data:') ? imageUrl.split(';')[0].replace('data:', '') : 'image/jpeg' // 默认为 jpeg
                        });
                    }
                });
            }

            return newItem;
        });
    }

    /**
     * 重写 chat 方法，直接调用阿里百炼 API
     * 支持 enable_thinking 参数
     */
    async chat(messages, options = {}) {
        console.log(log_prefix + "chat - messages %o", messages);
        console.log(log_prefix + "chat - options %o", options);
        // 构建请求体
        const requestBody = {
            model:CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_QWEN3_14B_MODELID ,
            messages: this.convertJson(messages),
            temperature: options.temperature || this.modelConfig.temperature,
            top_p: options.topP !== undefined ? options.topP : options.top_p || this.modelConfig.top_p,
            max_tokens: options.max_tokens || this.modelConfig.max_tokens,
            stream:false
        };
        // const requestBody = {
        //     model:
        //     messages: this._convertJson(messages),
        // }
        console.log(log_prefix + "chat - requestBody %o", requestBody);
        try {
            const response = await fetch(`${this.endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CUSTOM_MODEL_CONFIG.CHINAPOST_BAILIAN_APIKEY}`
                },
                body: JSON.stringify(requestBody)
            });
            console.log(log_prefix + "chat - response %o", response);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`CHINAPOSTBAILIAN API 调用失败: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            console.log(log_prefix + "chat - data %o", data);
            // 转换为 AI SDK 格式
            const result = {
                text: data.choices[0]?.message?.content || '',
                finishReason: data.choices[0]?.finish_reason || 'stop',
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                }
            };
            console.log(log_prefix + "chat - result %o", result);
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
            console.error('CHINAPOSTBAILIAN API 调用错误:', error);
            throw error;
        }
    }


}

module.exports = ChinaPostBaiLianClient;
