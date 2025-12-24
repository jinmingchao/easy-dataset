import { NextResponse } from 'next/server';
import LLMClient from '@/lib/llm/core/index';
import axios from "axios";

export async function POST(request, { params }) {
  console.log("调用 /api/projects/[projectId]/playground/chat - request: \n %o \n ------ \n params \n %o",request,{ params });
  try {
    const { projectId } = params;

    // 验证项目ID
    if (!projectId) {
      return NextResponse.json({ error: 'The project ID cannot be empty' }, { status: 400 });
    }

    // 获取请求体
    const { model, messages } = await request.json();
    console.log("调用 /api/projects/[projectId]/playground/chat - model: \n %o \n ------ \n messages \n %o",model, messages);
    // 验证请求参数
    if (!model) {
      return NextResponse.json({ error: 'The model parameters cannot be empty' }, { status: 400 });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'The message list cannot be empty' }, { status: 400 });
    }
    // jmc - 调用邮政qwen2.5VL模型逻辑:
    if (model.endpoint === 'http://10.1.153.200:8088/General/haproxy-othvllm/qwen72vl/v1/chat/completions?AccessCode=45BBBD2F200C862DD2C1F86368C32783') {
      console.log("调用 /api/projects/[projectId]/playground/chat - 调用中国邮政业财大模型-Qwen2.5VL-72");
      let response = '';

      // 提取user角色的消息，最多保留5条
      const raw_messages = []

      messages.forEach(message => {
        if (message.role === 'user' || message.role === 'assistant') {
          const msg = {
            "role":message.role,
            "content":[
              {"type": "text", "text":message.content}
            ]
          }
          raw_messages.push(msg)
          // user_messages.push({"type": "text", "text":message.content})
        }

        if (raw_messages.length > 10) {
          raw_messages.shift();
        }
      })
      console.log("调用 /api/projects/[projectId]/playground/chat \n raw_messages: \n %o \n",raw_messages);
      // console.log(msg);
      // 输出: ['消息2', '消息3', '消息4', '消息5', '消息6']

      // const user_msg = messages[0].content
      // let send_msg = {
      //   "model": "Qwen2.5-VL-72B",
      //   "messages": [
      //     {
      //       "role": "user",
      //       "content": [
      //         {
      //           "type": "text",
      //           "text": user_msg
      //         }
      //       ]
      //     }
      //   ],
      //   "temperature": 0.6,
      //   "top_p": 0.8,
      //   "max_tokens": 1024,
      //   "stream": false
      // }
      // let send_msg = {
      //   "model": "Qwen2.5-VL-72B",
      //   "messages": [
      //     {
      //       "role": "user",
      //       "content": user_messages
      //     },
      //     {
      //       "role": "assistant",
      //       "content": ai_messages
      //     }
      //   ],
      //   "temperature": 0.6,
      //   "top_p": 0.8,
      //   "max_tokens": 4096,
      //   "stream": false
      // }
      let send_msg = {
        "model": "Qwen2.5-VL-72B",
        "messages": raw_messages,
        "temperature": 0.6,
        "top_p": 0.8,
        "max_tokens": 16000,
        "stream": false
      }
      console.log("调用 /api/projects/[projectId]/playground/chat - send_msg: \n %o ",send_msg);
      try {
        const resp = await axios.post('http://10.1.153.200:8088/General/haproxy-othvllm/qwen72vl/v1/chat/completions?AccessCode=45BBBD2F200C862DD2C1F86368C32783', send_msg, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log('POST 响应:', JSON.stringify(resp.data, null, 2));
        // const jsonData = await response.json();
        const response = `${resp.data.choices[0].message.content}`;
        return NextResponse.json({response});
      } catch (error) {
        console.error('POST 失败:', error.message);
      }

    } else { //原始逻辑
      // 使用自定义的LLM客户端
      const llmClient = new LLMClient(model);
      console.log("调用 /api/projects/[projectId]/playground/chat - llmClient: \n %o", llmClient);
      // 格式化消息历史
      const formattedMessages = messages.map(msg => {
        // 处理纯文本消息
        if (typeof msg.content === 'string') {
          return {
            role: msg.role,
            content: msg.content
          };
        }
        // 处理包含图片的复合消息（用于视觉模型）
        else if (Array.isArray(msg.content)) {
          return {
            role: msg.role,
            content: msg.content
          };
        }
        // 默认情况
        return {
          role: msg.role,
          content: msg.content
        };
      });

      // 调用LLM API
      let response = '';
      try {
        const {answer, cot} = await llmClient.getResponseWithCOT(formattedMessages.filter(f => f.role !== 'error'));
        console.log("调用 /api/projects/[projectId]/playground/chat - answer: \n %o \n ------ \n cot \n %o", answer, cot);
        response = `<think>${cot}</think>${answer}`;
      } catch (error) {
        console.error('Failed to call LLM API:', String(error));
        return NextResponse.json(
            {
              error: `Failed to call ${model.modelId} model: ${error.message}`
            },
            {status: 500}
        );
      }

      return NextResponse.json({response});
    }
  } catch (error) {
    console.error('Failed to process chat request:', String(error));
    return NextResponse.json({ error: `Failed to process chat request: ${error.message}` }, { status: 500 });
  }
}
