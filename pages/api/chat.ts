import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

async function getAssistantResponse(question: string, assistant_id: string) {
  const openai = new OpenAI({
    apiKey: process.env["OPENAI_API_KEY"], // defaults to process.env["OPENAI_API_KEY"]
  });

  const thread = await openai.beta.threads.create()

  await openai.beta.threads.messages.create(
    thread.id,
    { 
      role: "user",
      content: question
    }
  );

  const run = await openai.beta.threads.runs.create(
    thread.id,
    { 
      assistant_id: assistant_id,
    }
  );

  let runStatus = await openai.beta.threads.runs.retrieve(
    thread.id,
    run.id
  );

  while (runStatus.status !== "completed") {
    await setTimeout(() => { console.log("waiting on run") }, 1000);
    runStatus = await openai.beta.threads.runs.retrieve(
      thread.id,
      run.id
    );
  }
  // console.log('run status', runStatus);

  const threadMessages = await openai.beta.threads.messages.list(
    thread.id
  );

  // @ts-ignore
  // console.log('assistant response', threadMessages.data[0].content[0].text.value);
  // @ts-ignore
  const assistant_response = threadMessages.data[0].content[0].text.value;
  return assistant_response;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // console.log('in chat handler', req.method);
  const { question, history } = req.body;

  // console.log('question', question);

  //only accept post requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!question) {
    return res.status(400).json({ message: 'No question in the request' });
  }
  // OpenAI recommends replacing newlines with spaces for best results
  const sanitizedQuestion = question.trim().replaceAll('\n', ' ');

  try {
    // console.log('connecting to openai');
    const DISTRIBUTOR_ASSISTANT_ID = "asst_uIfNCgpkcQdL90BG8s1npY0b"
    const sme_id = await getAssistantResponse(sanitizedQuestion, DISTRIBUTOR_ASSISTANT_ID);
    // console.log('sme_Id', sme_id);

    const sme_response = await getAssistantResponse(sanitizedQuestion, sme_id);

    // console.log('sme_response', sme_response);
    res.status(200).json({ text: sme_response });
  } catch (error: any) {
    console.log('error', error);
    res.status(500).json({ error: error.message || 'Something went wrong' });
  }
}
