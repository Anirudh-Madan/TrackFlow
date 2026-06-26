import{i as e,t}from"./react-B8IZ02wI.js";import{n,t as r}from"./createLucideIcon-DyCq-HOk.js";import{t as i}from"./calendar-BU63RiJu.js";import{n as a,r as o,t as s}from"./funnel-BAVp0K_K.js";import{t as c}from"./Modal-CUUzGYow.js";import{At as l,Bt as u,Ct as d,E as f,It as p,Nt as m,O as h,Pt as g,Qt as _,Rt as v,Ut as y,Zt as b,xt as x}from"./index-fP-tnhl0.js";var S=r(`arrow-up-right`,[[`path`,{d:`M7 7h10v10`,key:`1tivn9`}],[`path`,{d:`M7 17 17 7`,key:`1vkiza`}]]),C=r(`printer`,[[`path`,{d:`M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2`,key:`143wyd`}],[`path`,{d:`M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6`,key:`1itne7`}],[`rect`,{x:`6`,y:`14`,width:`12`,height:`8`,rx:`1`,key:`1ue0tg`}]]),w=e(t(),1),T=e=>h.get(`/challans`,{params:e}),E=n(),D={delivered:{label:`Delivered`,color:`bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40`,icon:o},in_transit:{label:`In Transit`,color:`bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40`,icon:S},pending:{label:`Pending`,color:`bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40`,icon:y},cancelled:{label:`Cancelled`,color:`bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40`,icon:x}};function O(e){let t=new Date().toLocaleString(`en-IN`);return`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Delivery Challan — ${e.id}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 24px; color: #1e293b; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
        .logo { font-size: 22px; font-weight: 800; color: #4f46e5; letter-spacing: -0.5px; }
        .logo span { color: #1e293b; }
        .challan-title { text-align: right; }
        .challan-title h2 { margin: 0; font-size: 16px; color: #4f46e5; }
        .challan-title p { margin: 2px 0; color: #64748b; }
        .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
        .meta-box h4 { margin: 0 0 6px; font-size: 10px; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; }
        .meta-box p { margin: 3px 0; font-size: 12px; }
        .meta-box .label { color: #64748b; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        thead tr { background: #4f46e5; color: white; }
        th { padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .total-row td { font-weight: bold; background: #eef2ff; border-top: 2px solid #4f46e5; }
        .footer { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        .sign-box { text-align: center; }
        .sign-box .line { border-bottom: 1px solid #334155; margin-bottom: 6px; height: 40px; }
        .sign-box p { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 10px; font-weight: 600; }
        .badge.delivered { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
        .badge.in_transit { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
        .badge.pending { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
        .badge.cancelled { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
        .print-note { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo">Track<span>Flow</span></div>
          <p style="margin:4px 0 0;color:#64748b;font-size:11px;">Enterprise Distribution Management</p>
        </div>
        <div class="challan-title">
          <h2>DELIVERY CHALLAN</h2>
          <p><strong>${e.id}</strong></p>
          <p>Date: ${e.date}</p>
          <p>Generated: ${t}</p>
          <p><span class="badge ${e.status}">${D[e.status]?.label||e.status}</span></p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-box">
          <h4>Party Details</h4>
          <p><strong>${e.party_name}</strong></p>
          <p><span class="label">City:</span> ${e.party_city}</p>
          <p><span class="label">Region:</span> ${e.region}</p>
        </div>
        <div class="meta-box">
          <h4>Dispatch Info</h4>
          <p><span class="label">Order Ref:</span> <strong>${e.order_ref}</strong></p>
          <p><span class="label">Dispatched By:</span> ${e.dispatched_by}</p>
          <p><span class="label">Vehicle No:</span> ${e.vehicle_no}</p>
          <p><span class="label">Driver:</span> ${e.driver}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>SKU</th>
            <th>Item Name</th>
            <th>Quantity</th>
            <th>Unit</th>
          </tr>
        </thead>
        <tbody>
          ${e.items.map((e,t)=>`
            <tr>
              <td>${t+1}</td>
              <td>${e.sku}</td>
              <td>${e.name}</td>
              <td>${e.qty}</td>
              <td>${e.unit}</td>
            </tr>
          `).join(``)}
          <tr class="total-row">
            <td colspan="3">Total</td>
            <td>${e.total_qty}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <div class="sign-box">
          <div class="line"></div>
          <p>Prepared By</p>
        </div>
        <div class="sign-box">
          <div class="line"></div>
          <p>Checked By</p>
        </div>
        <div class="sign-box">
          <div class="line"></div>
          <p>Receiver's Signature</p>
        </div>
      </div>

      <p class="print-note">This is a computer-generated delivery challan. No signature required.</p>
    </body>
    </html>
  `}function k(e){let t=O(e),n=window.open(``,`_blank`,`width=900,height=700`);if(!n){alert(`Please allow popups for this site to download challan.`);return}n.document.write(t),n.document.close(),n.focus(),n.print()}function A(e){let t=O(e),n=new Blob([t],{type:`text/html;charset=utf-8;`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=`challan_${e.id}.html`,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(r),_.success(`Challan HTML file downloaded!`)}function j({status:e}){let t=D[e]||D.pending,n=t.icon;return(0,E.jsxs)(`span`,{className:b(`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border`,t.color),children:[(0,E.jsx)(n,{className:`h-3 w-3`}),t.label]})}function M(){let[e,t]=(0,w.useState)([]),[n,r]=(0,w.useState)(!0),[o,h]=(0,w.useState)(``),[y,x]=(0,w.useState)(`all`),[S,O]=(0,w.useState)(null),M=(0,w.useCallback)(async()=>{r(!0);try{let e=await T();e.data?.success?t(e.data.data):_.error(e.data?.error||`Failed to fetch challans`)}catch{_.error(`Failed to load challans list`)}finally{r(!1)}},[]);(0,w.useEffect)(()=>{M()},[M]);let N=(0,w.useMemo)(()=>e.map(e=>{let t=e.order||{},n=t.party||{},r=n.region||{},i=t.salesManager||{},a=t.items||[],o=a.map(e=>({sku:e.product?.sku||`N/A`,name:e.product?.name||`N/A`,qty:e.quantity,unit:`pcs`})),s=a.reduce((e,t)=>e+t.quantity,0),c=(t.status||``).toLowerCase(),l=`pending`;return c===`dispatched`&&(l=`delivered`),c===`cancelled`&&(l=`cancelled`),c===`approved`&&(l=`in_transit`),{id:e.challan_number,dbId:e.id,order_ref:t.order_number||`N/A`,date:e.generated_at||e.created_at||new Date,party_name:n.company_name||`N/A`,party_city:r.name||`N/A`,region:r.name||`N/A`,dispatched_by:i.name||`N/A`,items:o,total_items:a.length,total_qty:s,status:l,vehicle_no:`—`,driver:`—`}}),[e]),P=()=>{let e=[[`Challan ID`,`Order Ref`,`Date`,`Party Name`,`Party City`,`Region`,`Dispatched By`,`Vehicle No`,`Driver`,`SKU`,`Item Name`,`Quantity`,`Unit`].map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`),...[[`CHN-2406-0041`,`ORD-2406-0098`,`2026-06-22`,`Verma Enterprises Pvt Ltd`,`Lucknow`,`North UP`,`Rajan Kumar`,`UP32 AK 4512`,`Suresh Yadav`,`SKU-1021`,`Heavy Duty Pipe 2"`,`120`,`pcs`],[`CHN-2406-0041`,`ORD-2406-0098`,`2026-06-22`,`Verma Enterprises Pvt Ltd`,`Lucknow`,`North UP`,`Rajan Kumar`,`UP32 AK 4512`,`Suresh Yadav`,`SKU-1044`,`Elbow Connector 90°`,`80`,`pcs`]].map(e=>e.map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`))].join(`
`),t=new Blob([e],{type:`text/csv;charset=utf-8;`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.setAttribute(`href`,n),r.setAttribute(`download`,`sample_challan.csv`),r.style.visibility=`hidden`,document.body.appendChild(r),r.click(),document.body.removeChild(r),_.success(`Sample challan CSV downloaded!`)},F=()=>{if(I.length===0){_.error(`No challans to export`);return}let e=[`Challan ID`,`Order Ref`,`Date`,`Party Name`,`Party City`,`Region`,`Dispatched By`,`Vehicle No`,`Driver`,`SKU`,`Item Name`,`Quantity`,`Unit`],t=[];I.forEach(e=>{e.items.forEach(n=>{t.push([e.id,e.order_ref,e.date,e.party_name,e.party_city,e.region,e.dispatched_by,e.vehicle_no,e.driver,n.sku,n.name,String(n.qty),n.unit])})});let n=[e.map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`),...t.map(e=>e.map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`))].join(`
`),r=new Blob([n],{type:`text/csv;charset=utf-8;`}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,`challans_export_${new Date().toISOString().split(`T`)[0]}.csv`),a.style.visibility=`hidden`,document.body.appendChild(a),a.click(),document.body.removeChild(a),_.success(`Challans list exported successfully!`)},I=(0,w.useMemo)(()=>N.filter(e=>{let t=e.id.toLowerCase().includes(o.toLowerCase())||e.party_name.toLowerCase().includes(o.toLowerCase())||e.order_ref.toLowerCase().includes(o.toLowerCase()),n=y===`all`||e.status===y;return t&&n}),[N,o,y]),L=(0,w.useMemo)(()=>({total:N.length,delivered:N.filter(e=>e.status===`delivered`).length,in_transit:N.filter(e=>e.status===`in_transit`).length,pending:N.filter(e=>e.status===`pending`).length}),[N]);return(0,E.jsxs)(`div`,{className:`animate-in space-y-6`,children:[(0,E.jsxs)(`div`,{className:`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`,children:[(0,E.jsxs)(`div`,{children:[(0,E.jsx)(`h1`,{className:`text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight`,children:`Delivery Challans`}),(0,E.jsx)(`p`,{className:`text-sm text-surface-500 dark:text-surface-400 mt-1`,children:`View, search, and download all dispatch challans.`})]}),(0,E.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,E.jsx)(f,{variant:`secondary`,size:`sm`,icon:a,onClick:P,id:`download-sample-challan-btn`,children:`Download Sample`}),(0,E.jsx)(f,{variant:`primary`,size:`sm`,icon:a,onClick:F,id:`export-challans-btn`,children:`Export CSV`})]})]}),(0,E.jsx)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-4`,children:[{label:`Total Challans`,value:L.total,color:`text-surface-900 dark:text-surface-50`},{label:`Delivered`,value:L.delivered,color:`text-success-600 dark:text-success-400`},{label:`In Transit`,value:L.in_transit,color:`text-primary-600 dark:text-primary-400`},{label:`Pending`,value:L.pending,color:`text-warning-600 dark:text-warning-400`}].map(e=>(0,E.jsxs)(`div`,{className:`card p-4`,children:[(0,E.jsx)(`p`,{className:`text-xs text-surface-500 dark:text-surface-400`,children:e.label}),(0,E.jsx)(`p`,{className:b(`text-2xl font-bold mt-0.5`,e.color),children:e.value})]},e.label))}),(0,E.jsxs)(`div`,{className:`card overflow-hidden`,children:[(0,E.jsxs)(`div`,{className:`p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between`,children:[(0,E.jsxs)(`div`,{className:`relative w-full sm:max-w-xs`,children:[(0,E.jsx)(l,{className:`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none`}),(0,E.jsx)(`input`,{type:`text`,placeholder:`Search challan, party, order...`,value:o,onChange:e=>h(e.target.value),className:`input-base pl-9 py-1.5`,id:`challan-search`})]}),(0,E.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,E.jsx)(s,{className:`h-4 w-4 text-surface-400`}),[`all`,`delivered`,`in_transit`,`pending`,`cancelled`].map(e=>(0,E.jsx)(`button`,{onClick:()=>x(e),className:b(`px-3 py-1 rounded-lg text-xs font-medium transition-colors border`,y===e?`bg-primary-600 text-white border-primary-600`:`bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700`),children:e===`all`?`All`:D[e]?.label},e))]}),(0,E.jsxs)(`div`,{className:`text-xs text-surface-500 font-medium shrink-0`,children:[I.length,` of `,N.length]})]}),n?(0,E.jsxs)(`div`,{className:`p-12 text-center`,children:[(0,E.jsx)(p,{className:`mx-auto h-8 w-8 animate-spin text-primary-600 mb-3`}),(0,E.jsx)(`p`,{className:`text-xs text-surface-500`,children:`Loading challans from database...`})]}):(0,E.jsx)(`div`,{className:`overflow-x-auto`,children:I.length===0?(0,E.jsxs)(`div`,{className:`p-12 text-center`,children:[(0,E.jsx)(v,{className:`mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3`}),(0,E.jsx)(`h3`,{className:`text-sm font-semibold text-surface-900 dark:text-surface-100`,children:`No challans found`}),(0,E.jsx)(`p`,{className:`text-xs text-surface-500 mt-1`,children:`Try adjusting your search or filter.`})]}):(0,E.jsxs)(`table`,{className:`w-full text-left border-collapse`,children:[(0,E.jsx)(`thead`,{children:(0,E.jsxs)(`tr`,{className:`border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider`,children:[(0,E.jsx)(`th`,{className:`px-5 py-3.5`,children:`Challan ID`}),(0,E.jsx)(`th`,{className:`px-5 py-3.5`,children:`Date`}),(0,E.jsx)(`th`,{className:`px-5 py-3.5`,children:`Party`}),(0,E.jsx)(`th`,{className:`px-5 py-3.5`,children:`Items`}),(0,E.jsx)(`th`,{className:`px-5 py-3.5`,children:`Dispatched By`}),(0,E.jsx)(`th`,{className:`px-5 py-3.5`,children:`Status`}),(0,E.jsx)(`th`,{className:`px-5 py-3.5 text-right`,children:`Actions`})]})}),(0,E.jsx)(`tbody`,{className:`divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300`,children:I.map(e=>(0,E.jsxs)(`tr`,{className:`table-row-hover`,children:[(0,E.jsxs)(`td`,{className:`px-5 py-4`,children:[(0,E.jsx)(`div`,{className:`font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs`,children:e.id}),(0,E.jsx)(`div`,{className:`text-xs text-surface-400 mt-0.5`,children:e.order_ref})]}),(0,E.jsx)(`td`,{className:`px-5 py-4 text-xs text-surface-500`,children:(0,E.jsxs)(`div`,{className:`flex items-center gap-1.5`,children:[(0,E.jsx)(i,{className:`h-3.5 w-3.5`}),new Date(e.date).toLocaleDateString(`en-IN`,{day:`2-digit`,month:`short`,year:`numeric`})]})}),(0,E.jsxs)(`td`,{className:`px-5 py-4`,children:[(0,E.jsx)(`div`,{className:`font-semibold text-surface-900 dark:text-surface-50 text-sm`,children:e.party_name}),(0,E.jsxs)(`div`,{className:`text-xs text-surface-400 flex items-center gap-1 mt-0.5`,children:[(0,E.jsx)(g,{className:`h-3 w-3`}),` `,e.party_city,` · `,e.region]})]}),(0,E.jsx)(`td`,{className:`px-5 py-4`,children:(0,E.jsxs)(`span`,{className:`inline-flex items-center gap-1 text-xs font-medium text-surface-700 dark:text-surface-300`,children:[(0,E.jsx)(m,{className:`h-3.5 w-3.5 text-surface-400`}),e.total_items,` SKUs, `,e.total_qty,` units`]})}),(0,E.jsx)(`td`,{className:`px-5 py-4`,children:(0,E.jsxs)(`div`,{className:`flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400`,children:[(0,E.jsx)(d,{className:`h-3.5 w-3.5`}),` `,e.dispatched_by]})}),(0,E.jsx)(`td`,{className:`px-5 py-4`,children:(0,E.jsx)(j,{status:e.status})}),(0,E.jsx)(`td`,{className:`px-5 py-4`,children:(0,E.jsxs)(`div`,{className:`flex items-center justify-end gap-2`,children:[(0,E.jsx)(f,{variant:`ghost`,size:`sm`,icon:u,onClick:()=>O(e),id:`view-challan-${e.dbId}`,children:`View`}),(0,E.jsx)(f,{variant:`secondary`,size:`sm`,icon:a,onClick:()=>A(e),id:`download-html-${e.dbId}`,children:`Download`}),(0,E.jsx)(f,{variant:`secondary`,size:`sm`,icon:C,onClick:()=>k(e),id:`download-challan-${e.dbId}`,children:`Print`})]})})]},e.id))})]})})]}),(0,E.jsx)(c,{open:!!S,onClose:()=>O(null),title:`Challan: ${S?.id}`,description:`Order Ref: ${S?.order_ref}`,size:`lg`,children:S&&(0,E.jsxs)(`div`,{className:`space-y-5`,children:[(0,E.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,E.jsx)(j,{status:S.status}),(0,E.jsxs)(`span`,{className:`text-xs text-surface-400 flex items-center gap-1`,children:[(0,E.jsx)(i,{className:`h-3.5 w-3.5`}),new Date(S.date).toLocaleDateString(`en-IN`,{dateStyle:`long`})]})]}),(0,E.jsxs)(`div`,{className:`grid grid-cols-1 sm:grid-cols-2 gap-4`,children:[(0,E.jsxs)(`div`,{className:`rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2`,children:[(0,E.jsx)(`p`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-400`,children:`Party Details`}),(0,E.jsx)(`p`,{className:`font-semibold text-surface-900 dark:text-surface-50`,children:S.party_name}),(0,E.jsx)(`p`,{className:`text-sm text-surface-500`,children:S.party_city}),(0,E.jsxs)(`p`,{className:`text-xs text-surface-400 flex items-center gap-1`,children:[(0,E.jsx)(g,{className:`h-3.5 w-3.5`}),` `,S.region]})]}),(0,E.jsxs)(`div`,{className:`rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2`,children:[(0,E.jsx)(`p`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-400`,children:`Dispatch Info`}),(0,E.jsxs)(`p`,{className:`text-sm text-surface-700 dark:text-surface-300`,children:[(0,E.jsx)(`span`,{className:`text-surface-400 text-xs`,children:`Dispatched By: `}),S.dispatched_by]}),(0,E.jsxs)(`p`,{className:`text-sm text-surface-700 dark:text-surface-300`,children:[(0,E.jsx)(`span`,{className:`text-surface-400 text-xs`,children:`Vehicle: `}),S.vehicle_no]}),(0,E.jsxs)(`p`,{className:`text-sm text-surface-700 dark:text-surface-300`,children:[(0,E.jsx)(`span`,{className:`text-surface-400 text-xs`,children:`Driver: `}),S.driver]})]})]}),(0,E.jsxs)(`div`,{children:[(0,E.jsx)(`p`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2`,children:`Dispatched Items`}),(0,E.jsx)(`div`,{className:`rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden`,children:(0,E.jsxs)(`table`,{className:`w-full text-sm text-left border-collapse`,children:[(0,E.jsx)(`thead`,{className:`bg-surface-50 dark:bg-surface-700/50`,children:(0,E.jsxs)(`tr`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400`,children:[(0,E.jsx)(`th`,{className:`px-4 py-2.5`,children:`#`}),(0,E.jsx)(`th`,{className:`px-4 py-2.5`,children:`SKU`}),(0,E.jsx)(`th`,{className:`px-4 py-2.5`,children:`Item`}),(0,E.jsx)(`th`,{className:`px-4 py-2.5 text-right`,children:`Qty`}),(0,E.jsx)(`th`,{className:`px-4 py-2.5`,children:`Unit`})]})}),(0,E.jsx)(`tbody`,{className:`divide-y divide-surface-100 dark:divide-surface-700`,children:S.items.map((e,t)=>(0,E.jsxs)(`tr`,{className:`table-row-hover`,children:[(0,E.jsx)(`td`,{className:`px-4 py-2.5 text-surface-400`,children:t+1}),(0,E.jsx)(`td`,{className:`px-4 py-2.5 font-mono text-xs text-primary-600 dark:text-primary-400`,children:e.sku}),(0,E.jsx)(`td`,{className:`px-4 py-2.5 font-medium text-surface-900 dark:text-surface-50`,children:e.name}),(0,E.jsx)(`td`,{className:`px-4 py-2.5 text-right font-semibold`,children:e.qty}),(0,E.jsx)(`td`,{className:`px-4 py-2.5 text-surface-500`,children:e.unit})]},e.sku))}),(0,E.jsx)(`tfoot`,{children:(0,E.jsxs)(`tr`,{className:`bg-surface-50 dark:bg-surface-700/50 font-semibold text-sm`,children:[(0,E.jsx)(`td`,{colSpan:3,className:`px-4 py-2.5 text-surface-600 dark:text-surface-300`,children:`Total`}),(0,E.jsx)(`td`,{className:`px-4 py-2.5 text-right text-surface-900 dark:text-surface-50`,children:S.total_qty}),(0,E.jsx)(`td`,{className:`px-4 py-2.5`})]})})]})})]}),(0,E.jsxs)(`div`,{className:`flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700`,children:[(0,E.jsx)(f,{variant:`secondary`,onClick:()=>O(null),id:`challan-modal-close`,children:`Close`}),(0,E.jsx)(f,{variant:`secondary`,icon:a,onClick:()=>A(S),id:`challan-modal-download`,children:`Download HTML`}),(0,E.jsx)(f,{icon:C,onClick:()=>k(S),id:`challan-modal-print`,children:`Print`})]})]})})]})}export{M as default};