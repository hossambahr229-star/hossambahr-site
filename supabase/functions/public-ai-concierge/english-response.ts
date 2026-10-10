import {recordedFactTranslations} from './recorded-fact-translations.ts';
function recordedTranslation(text: string): string | null {
 return Object.prototype.hasOwnProperty.call(recordedFactTranslations,text)?recordedFactTranslations[text]:null;
}
function recordedEnglish(value: unknown): string | null {
 const text=String(value??'').trim();
 const exact=recordedTranslation(text)||recordedTranslation(text.replace(/[.]+$/,''));
 if(exact)return exact;
 const lines=text.split('\n').filter(Boolean);
 if(lines.length<2)return null;
 const translated=lines.map(line=>recordedTranslation(line.trim())||recordedTranslation(line.trim().replace(/[.]+$/,'')));
 return translated.every(Boolean)?translated.join('\n'):null;
}
export function englishQuestion(value: string) {
 const text=String(value||'');
 if (/هل الموظف من خارج/.test(text)) return 'Is the employee arriving from outside the UAE, transferring within the UAE, or on a family residence?';
 if (/هل الموظف داخل/.test(text)) return 'Is the employee currently inside or outside the UAE?';
 if (/إمارة|الإمارة|الإماره|اماره/.test(text)) return /الكفيل/.test(text) ? 'Which emirate issued the sponsor’s residence?' : 'Which emirate is this transaction in?';
 if (/أكثر من خدمة/.test(text)) return 'There is more than one possible service. What outcome do you want to achieve?';
 if (/النتيجة|نوع المعاملة/.test(text)) return 'What transaction or outcome do you want to achieve?';
 return text;
}
export function englishResult(result: any) {
 const match=result?.matches?.[0];
 const answer=result?.answer||{};
 let text='';
 const missing=answer.fact_status==='MISSING_INFORMATION';
 const verified=answer.fact_status==='VERIFIED_FACT'&&answer.grounded===true;
 const recorded=verified?recordedEnglish(answer.text):null;
 if(answer.fact_status==='NEEDS_CLARIFICATION' && /إقامة عامل\/عاملة مساعدة/.test(result.understood_intent||'')) text='For the domestic worker’s residence, which emirate issued it? This is a residence transaction, separate from employment contracts and work permits.';
 else if(answer.evidence?.review_pending && missing) text='The official source is available, but its changed details are awaiting review. I cannot confirm earlier fees, times, documents or conditions until that review is complete.';
 else if(answer.focus==='fees' && missing) text='I cannot confirm a government fee for this case from the current verified record. I will not estimate a figure. Check the official source before applying or paying.';
 else if(answer.focus==='duration' && missing) text='A verified processing time is not available for this case. I will not estimate one.';
 else if(answer.focus==='documents' && missing) text='A complete verified document list is not available for this case. Check the official source.';
 else if(answer.focus==='conditions' && missing) text='Detailed conditions are not verified in the current record. I have kept the same service in this conversation.';
 else if(answer.focus==='approvals' && missing) text='The current verified record is insufficient to confirm a specific external approval for this case.';
 else if(answer.focus==='start' && match) text='The service is identified. You can start the transaction with the service, emirate and authority preserved in your handoff.';
 else if(answer.focus==='source') text=match?.official_source?.url?'The official source for this service is available below.':'A verified official source is not available for this case.';
 else if(answer.focus==='authority') text=match?.authority?.name_en ? 'The responsible authority is '+match.authority.name_en+'.' : 'I cannot confirm the responsible authority from the current record.';
 else if(!match && missing) text='A verified service pathway is not available for this case in the current catalog. I cannot confirm government requirements or fees or route you to a different service.';
 else if(answer.fact_status==='NEEDS_CLARIFICATION' || !match) text='I need to confirm the transaction or jurisdiction before presenting government requirements or fees. '+englishQuestion(result.follow_up_questions?.[0]||'');
 else if(answer.focus==='overview'){
  const identity=match.service_name_en;
  if(!identity) return result;
  text=(result.confidence==='high'?'The matching service is ':'A possible pathway is ')+identity+(match.authority?.name_en?' through '+match.authority.name_en:'')+'.';
  const conditions=verified?recordedEnglish(answer.evidence?.supporting_rule?.value):null;
  if(conditions)text+=' '+conditions;
 }else if(recorded) text=recorded;
 else text='Verified source record, in its original language:\n'+String(answer.text||'');
 return {...result,answer:{...answer,text},follow_up_questions:(result.follow_up_questions||[]).map(englishQuestion)};
}
