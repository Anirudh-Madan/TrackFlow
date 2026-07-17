import{i as e,t}from"./react-B8IZ02wI.js";import{n,t as r}from"./createLucideIcon-DyCq-HOk.js";import{t as i}from"./calendar-BU63RiJu.js";import{n as a,t as o}from"./download-D4XiO6bC.js";import{t as s}from"./funnel-CYpwXK1l.js";import{t as c}from"./printer-DKN8YwXk.js";import{t as l}from"./Modal-DcjZ9G0h.js";import{$t as u,Bn as d,Dn as f,Rn as p,Sn as m,X as h,Xt as g,Yt as _,gn as v,hn as y,pn as b,un as x,wn as S}from"./index-DOCD3_Ca.js";import{t as C}from"./usePermission-uX-J64--.js";var w=r(`arrow-up-right`,[[`path`,{d:`M7 7h10v10`,key:`1tivn9`}],[`path`,{d:`M7 17 17 7`,key:`1vkiza`}]]),T=e(t(),1),E=e=>_.get(`/challans`,{params:e}),D=n(),O={delivered:{label:`Delivered`,color:`bg-success-50 text-success-700 border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-900/40`,icon:a},in_transit:{label:`In Transit`,color:`bg-primary-50 text-primary-700 border-primary-200 dark:bg-primary-900/20 dark:text-primary-400 dark:border-primary-900/40`,icon:w},pending:{label:`Pending`,color:`bg-warning-50 text-warning-700 border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-900/40`,icon:f},cancelled:{label:`Cancelled`,color:`bg-danger-50 text-danger-600 border-danger-200 dark:bg-danger-900/20 dark:text-danger-400 dark:border-danger-900/40`,icon:g}};function k(e){return new Date().toLocaleString(`en-IN`),`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Delivery Challan — ${e.id}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; font-size: 13px; margin: 0; padding: 40px; color: #0f172a; }
        
        .header-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .company-info h1 { font-size: 22px; font-weight: 700; color: #1e3a8a; margin: 0 0 8px 0; letter-spacing: 0.5px; }
        .company-info p { font-size: 12px; color: #334155; margin: 4px 0; font-weight: 500; }
        
        .challan-meta { text-align: right; }
        .challan-number-box { border: 1px solid #1e3a8a; border-radius: 6px; padding: 6px 14px; display: inline-block; margin-bottom: 12px; }
        .challan-number-box span:first-child { font-weight: 400; font-size: 13px; color: #1e3a8a; margin-right: 6px; }
        .challan-number-box span:last-child { font-weight: 700; font-size: 15px; color: #0f172a; }
        .challan-date { font-size: 12px; color: #475569; font-weight: 500; }
        
        .divider { border-top: 1px solid #0f172a; border-bottom: 1px solid #0f172a; height: 2px; margin: 20px 0; }
        
        .title-section { text-align: center; margin: 24px 0 32px 0; }
        .title-section h2 { font-size: 14px; font-weight: 600; letter-spacing: 2.5px; color: #0f172a; margin: 0; }
        
        .customer-section { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .customer-block h4 { font-size: 10px; font-weight: 600; color: #64748b; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .customer-block p { font-size: 14px; font-weight: 500; color: #1e3a8a; margin: 0; }
        .customer-right { text-align: right; }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { text-align: left; font-size: 10px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 16px; }
        th.text-right { text-align: right; }
        th.text-center { text-align: center; }
        td { padding: 16px 0; font-size: 13px; color: #0f172a; }
        td.text-right { text-align: right; }
        td.text-center { text-align: center; }
        td.font-medium { font-weight: 500; color: #1e3a8a; }
        
        .summary-section { display: flex; justify-content: space-between; margin-bottom: 100px; }
        .salesman-block { font-size: 11px; font-weight: 600; color: #64748b; }
        .salesman-block span { display: block; font-size: 15px; font-weight: 700; color: #1e3a8a; margin-top: 4px; }
        .total-block { text-align: right; font-size: 11px; font-weight: 600; color: #64748b; }
        .total-block span { display: block; font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 4px; }
        
        .footer-sig-container { display: flex; justify-content: flex-end; margin-top: 60px; }
        .footer-sig { text-align: center; width: 220px; }
        .footer-sig .line { border-top: 1px solid #0f172a; margin-bottom: 8px; }
        .footer-sig p { font-size: 11px; color: #64748b; font-weight: 500; margin: 0; }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="company-info">
          <h1>SHREE RAMDEV MOTORS</h1>
          <p>OLD POWER HOUSE ROAD, BIKANER</p>
          <p>GSTIN: 08ALDPD3168N1ZW</p>
        </div>
        <div class="challan-meta">
          <div class="challan-number-box">
            <span>No.</span><span>${e.id.replace(`CHN-`,``)}</span>
          </div>
          <div class="challan-date">Date: ${(()=>{let t=new Date(e.date);return`${t.getDate()}-${t.getMonth()+1}-${t.getFullYear()}`})()}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="title-section">
        <h2>DELIVERY CHALLAN</h2>
      </div>

      <div class="customer-section">
        <div class="customer-block">
          <h4>CUSTOMER NAME</h4>
          <p>${e.party_name}</p>
        </div>
        <div class="customer-block customer-right">
          <h4>CUSTOMER COMPANY</h4>
          <p>—</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>SR</th>
            <th>PART NUMBER</th>
            <th>DESCRIPTION</th>
            <th class="text-right">QTY</th>
            <th class="text-right">PRICE/UNIT</th>
            <th class="text-right">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${e.items.map((e,t)=>`
            <tr>
              <td>${t+1}</td>
              <td class="font-medium">${e.sku}</td>
              <td>${e.name}</td>
              <td class="text-right font-medium">${e.qty}</td>
              <td class="text-right font-medium">₹${e.price.toFixed(2)}</td>
              <td class="text-right font-medium">₹${e.total.toFixed(2)}</td>
            </tr>
          `).join(``)}
        </tbody>
      </table>

      <div class="summary-section">
        <div class="salesman-block">
          Salesman
          <span>${e.dispatched_by}</span>
        </div>
        <div class="total-block">
          Total Amount
          <span>₹${e.grand_total?e.grand_total.toFixed(2):`0.00`}</span>
        </div>
      </div>

      <div class="footer-sig-container">
        <div class="footer-sig">
          <div class="line"></div>
          <p>Authorized Signature</p>
        </div>
      </div>
    </body>
    </html>
  `}function A(e){let t=k(e),n=window.open(``,`_blank`,`width=900,height=700`);if(!n){alert(`Please allow popups for this site to download challan.`);return}n.document.write(t),n.document.close(),n.focus(),n.print()}function j(e){let t=k(e),n=new Blob([t],{type:`text/html;charset=utf-8;`}),r=URL.createObjectURL(n),i=document.createElement(`a`);i.href=r,i.download=`challan_${e.id}.html`,document.body.appendChild(i),i.click(),document.body.removeChild(i),URL.revokeObjectURL(r),d.success(`Challan HTML file downloaded!`)}function M({status:e}){let t=O[e]||O.pending,n=t.icon;return(0,D.jsxs)(`span`,{className:p(`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border`,t.color),children:[(0,D.jsx)(n,{className:`h-3 w-3`}),t.label]})}function N(){let e=C(`challan.download`),[t,n]=(0,T.useState)([]),[r,a]=(0,T.useState)(!0),[f,g]=(0,T.useState)(``),[_,w]=(0,T.useState)(`all`),[k,N]=(0,T.useState)(null),P=(0,T.useCallback)(async()=>{a(!0);try{let e=await E();e.success?n(e.data):d.error(e.error||`Failed to fetch challans`)}catch{d.error(`Failed to load challans list`)}finally{a(!1)}},[]);(0,T.useEffect)(()=>{P()},[P]);let F=(0,T.useMemo)(()=>t.map(e=>{let t=e.order||{},n=t.party||{},r=n.region||{},i=t.salesManager||{},a=t.items||[],o=a.map(e=>({sku:e.product?.sku||`N/A`,name:e.product?.name||`N/A`,qty:e.quantity,unit:`pcs`,price:parseFloat(e.sm_price||0),total:parseFloat(e.line_total||0),supplier:e.product?.supplier||``})),s=a.reduce((e,t)=>e+t.quantity,0),c=(t.status||``).toLowerCase(),l=`pending`;c===`dispatched`&&(l=`delivered`),c===`cancelled`&&(l=`cancelled`),c===`approved`&&(l=`in_transit`);let u=Array.from(new Set(a.map(e=>e.product?.supplier).filter(Boolean))),d=u.length>0?u.join(`, `):`—`;return{id:e.challan_number,dbId:e.id,order_ref:t.order_number||`N/A`,date:e.generated_at||e.created_at||new Date,party_name:n.company_name||`N/A`,party_city:r.name||`N/A`,region:r.name||`N/A`,dispatched_by:i.name||`N/A`,supplier:d,items:o,total_items:a.length,total_qty:s,grand_total:parseFloat(t.grand_total||0),status:l,vehicle_no:`—`,driver:`—`}}),[t]),I=()=>{let e=[[`Challan ID`,`Order Ref`,`Date`,`Party Name`,`Party City`,`Region`,`Dispatched By`,`Vehicle No`,`Driver`,`SKU`,`Item Name`,`Quantity`,`Unit`].map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`),...[[`CHN-2406-0041`,`ORD-2406-0098`,`2026-06-22`,`Verma Enterprises Pvt Ltd`,`Lucknow`,`North UP`,`Rajan Kumar`,`UP32 AK 4512`,`Suresh Yadav`,`SKU-1021`,`Heavy Duty Pipe 2"`,`120`,`pcs`],[`CHN-2406-0041`,`ORD-2406-0098`,`2026-06-22`,`Verma Enterprises Pvt Ltd`,`Lucknow`,`North UP`,`Rajan Kumar`,`UP32 AK 4512`,`Suresh Yadav`,`SKU-1044`,`Elbow Connector 90°`,`80`,`pcs`]].map(e=>e.map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`))].join(`
`),t=new Blob([e],{type:`text/csv;charset=utf-8;`}),n=URL.createObjectURL(t),r=document.createElement(`a`);r.setAttribute(`href`,n),r.setAttribute(`download`,`sample_challan.csv`),r.style.visibility=`hidden`,document.body.appendChild(r),r.click(),document.body.removeChild(r),d.success(`Sample challan CSV downloaded!`)},L=()=>{if(R.length===0){d.error(`No challans to export`);return}let e=[`Challan NO`,`Order Ref`,`Date`,`CUSTOMER`,`COMPANY`,`Region`,`Salesman`,`Supplier`,`Vehicle No`,`Driver`,`Part No`,`Item Name`,`Quantity`,`Unit`],t=[];R.forEach(e=>{e.items.forEach(n=>{let r=[e.id,e.order_ref,e.date,e.party_name,e.party_city,e.region,e.dispatched_by,n.supplier||e.supplier,e.vehicle_no,e.driver,n.sku,n.name,String(n.qty),n.unit].map(e=>e==null||e===``||e===`—`||e===`N/A`?`NIL`:String(e));t.push(r)})});let n=[e.map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`),...t.map(e=>e.map(e=>`"${e.replace(/"/g,`""`)}"`).join(`,`))].join(`
`),r=new Blob([n],{type:`text/csv;charset=utf-8;`}),i=URL.createObjectURL(r),a=document.createElement(`a`);a.setAttribute(`href`,i),a.setAttribute(`download`,`challans_export_${new Date().toISOString().split(`T`)[0]}.csv`),a.style.visibility=`hidden`,document.body.appendChild(a),a.click(),document.body.removeChild(a),d.success(`Challans list exported successfully!`)},R=(0,T.useMemo)(()=>F.filter(e=>{let t=e.id.toLowerCase().includes(f.toLowerCase())||e.party_name.toLowerCase().includes(f.toLowerCase())||e.order_ref.toLowerCase().includes(f.toLowerCase()),n=_===`all`||e.status===_;return t&&n}),[F,f,_]),z=(0,T.useMemo)(()=>({total:F.length,delivered:F.filter(e=>e.status===`delivered`).length,in_transit:F.filter(e=>e.status===`in_transit`).length,pending:F.filter(e=>e.status===`pending`).length}),[F]);return(0,D.jsxs)(`div`,{className:`animate-in space-y-6`,children:[(0,D.jsxs)(`div`,{className:`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`,children:[(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`h1`,{className:`text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight`,children:`Delivery Challans`}),(0,D.jsx)(`p`,{className:`text-sm text-surface-500 dark:text-surface-400 mt-1`,children:`View, search, and download all dispatch challans.`})]}),(0,D.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,D.jsx)(h,{variant:`secondary`,size:`sm`,icon:o,onClick:I,id:`download-sample-challan-btn`,children:`Download Sample`}),(0,D.jsx)(h,{variant:`primary`,size:`sm`,icon:o,onClick:L,id:`export-challans-btn`,children:`Export CSV`})]})]}),(0,D.jsx)(`div`,{className:`grid grid-cols-2 sm:grid-cols-4 gap-4`,children:[{label:`Total Challans`,value:z.total,color:`text-surface-900 dark:text-surface-50`},{label:`Delivered`,value:z.delivered,color:`text-success-600 dark:text-success-400`},{label:`In Transit`,value:z.in_transit,color:`text-primary-600 dark:text-primary-400`},{label:`Pending`,value:z.pending,color:`text-warning-600 dark:text-warning-400`}].map(e=>(0,D.jsxs)(`div`,{className:`card p-4`,children:[(0,D.jsx)(`p`,{className:`text-xs text-surface-500 dark:text-surface-400`,children:e.label}),(0,D.jsx)(`p`,{className:p(`text-2xl font-bold mt-0.5`,e.color),children:e.value})]},e.label))}),(0,D.jsxs)(`div`,{className:`card overflow-hidden`,children:[(0,D.jsxs)(`div`,{className:`p-4 border-b border-surface-200 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/50 flex flex-col sm:flex-row gap-3 items-center justify-between`,children:[(0,D.jsxs)(`div`,{className:`relative w-full sm:max-w-xs`,children:[(0,D.jsx)(x,{className:`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none`}),(0,D.jsx)(`input`,{type:`text`,placeholder:`Search challan, party, order...`,value:f,onChange:e=>g(e.target.value),className:`input-base pl-9 py-1.5`,id:`challan-search`})]}),(0,D.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,D.jsx)(s,{className:`h-4 w-4 text-surface-400`}),[`all`,`delivered`,`in_transit`,`pending`,`cancelled`].map(e=>(0,D.jsx)(`button`,{onClick:()=>w(e),className:p(`px-3 py-1 rounded-lg text-xs font-medium transition-colors border`,_===e?`bg-primary-600 text-white border-primary-600`:`bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-300 border-surface-300 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700`),children:e===`all`?`All`:O[e]?.label},e))]}),(0,D.jsxs)(`div`,{className:`text-xs text-surface-500 font-medium shrink-0`,children:[R.length,` of `,F.length]})]}),r?(0,D.jsxs)(`div`,{className:`p-12 text-center`,children:[(0,D.jsx)(v,{className:`mx-auto h-8 w-8 animate-spin text-primary-600 mb-3`}),(0,D.jsx)(`p`,{className:`text-xs text-surface-500`,children:`Loading challans from database...`})]}):(0,D.jsx)(`div`,{className:`overflow-x-auto`,children:R.length===0?(0,D.jsxs)(`div`,{className:`p-12 text-center`,children:[(0,D.jsx)(m,{className:`mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3`}),(0,D.jsx)(`h3`,{className:`text-sm font-semibold text-surface-900 dark:text-surface-100`,children:`No challans found`}),(0,D.jsx)(`p`,{className:`text-xs text-surface-500 mt-1`,children:`Try adjusting your search or filter.`})]}):(0,D.jsxs)(`table`,{className:`w-full min-w-[1000px] text-left border-collapse`,children:[(0,D.jsx)(`thead`,{children:(0,D.jsxs)(`tr`,{className:`border-b border-surface-200 dark:border-surface-700 bg-surface-50/70 dark:bg-surface-800/70 text-xs font-semibold text-surface-600 dark:text-surface-400 uppercase tracking-wider`,children:[(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`CHALLAN NO`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`DATE`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`CUSTOMER`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`COMPANY`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`SALESMAN`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`SUPPLIER`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5`,children:`ITEMS`}),(0,D.jsx)(`th`,{className:`px-5 py-3.5 text-right`,children:`ACTIONS`})]})}),(0,D.jsx)(`tbody`,{className:`divide-y divide-surface-100 dark:divide-surface-700 text-sm text-surface-700 dark:text-surface-300`,children:R.map(t=>(0,D.jsxs)(`tr`,{className:`table-row-hover`,children:[(0,D.jsxs)(`td`,{className:`px-5 py-4`,children:[(0,D.jsx)(`div`,{className:`font-mono font-semibold text-primary-700 dark:text-primary-400 text-xs`,children:t.id}),(0,D.jsx)(`div`,{className:`text-xs text-surface-400 mt-0.5`,children:t.order_ref})]}),(0,D.jsx)(`td`,{className:`px-5 py-4 text-xs text-surface-500`,children:(0,D.jsxs)(`div`,{className:`flex items-center gap-1.5`,children:[(0,D.jsx)(i,{className:`h-3.5 w-3.5`}),new Date(t.date).toLocaleDateString(`en-IN`,{day:`2-digit`,month:`short`,year:`numeric`})]})}),(0,D.jsx)(`td`,{className:`px-5 py-4`,children:(0,D.jsx)(`div`,{className:`font-semibold text-surface-900 dark:text-surface-50 text-sm`,children:`—`})}),(0,D.jsxs)(`td`,{className:`px-5 py-4`,children:[(0,D.jsx)(`div`,{className:`font-semibold text-surface-900 dark:text-surface-50 text-sm`,children:t.party_name}),(0,D.jsxs)(`div`,{className:`text-xs text-surface-400 flex items-center gap-1 mt-0.5`,children:[(0,D.jsx)(y,{className:`h-3 w-3`}),` `,t.party_city,` · `,t.region]})]}),(0,D.jsx)(`td`,{className:`px-5 py-4`,children:(0,D.jsxs)(`div`,{className:`flex items-center gap-1.5 text-xs text-surface-600 dark:text-surface-400`,children:[(0,D.jsx)(u,{className:`h-3.5 w-3.5`}),` `,t.dispatched_by]})}),(0,D.jsx)(`td`,{className:`px-5 py-4`,children:(0,D.jsx)(`span`,{className:`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300`,children:t.supplier})}),(0,D.jsx)(`td`,{className:`px-5 py-4`,children:(0,D.jsxs)(`span`,{className:`inline-flex items-center gap-1 text-xs font-medium text-surface-700 dark:text-surface-300`,children:[(0,D.jsx)(b,{className:`h-3.5 w-3.5 text-surface-400`}),t.total_items,` SKUs, `,t.total_qty,` units`]})}),(0,D.jsx)(`td`,{className:`px-5 py-4`,children:(0,D.jsxs)(`div`,{className:`flex items-center justify-end gap-2`,children:[(0,D.jsx)(h,{variant:`ghost`,size:`sm`,icon:S,onClick:()=>N(t),id:`view-challan-${t.dbId}`,children:`View`}),e&&(0,D.jsx)(h,{variant:`secondary`,size:`sm`,icon:o,onClick:()=>j(t),id:`download-html-${t.dbId}`,children:`Download`}),e&&(0,D.jsx)(h,{variant:`secondary`,size:`sm`,icon:c,onClick:()=>A(t),id:`download-challan-${t.dbId}`,children:`Print`})]})})]},t.id))})]})})]}),(0,D.jsx)(l,{open:!!k,onClose:()=>N(null),title:`Challan: ${k?.id}`,description:`Order Ref: ${k?.order_ref}`,size:`lg`,children:k&&(0,D.jsxs)(`div`,{className:`space-y-5`,children:[(0,D.jsxs)(`div`,{className:`flex items-center justify-between`,children:[(0,D.jsx)(M,{status:k.status}),(0,D.jsxs)(`span`,{className:`text-xs text-surface-400 flex items-center gap-1`,children:[(0,D.jsx)(i,{className:`h-3.5 w-3.5`}),new Date(k.date).toLocaleDateString(`en-IN`,{dateStyle:`long`})]})]}),(0,D.jsxs)(`div`,{className:`grid grid-cols-1 sm:grid-cols-2 gap-4`,children:[(0,D.jsxs)(`div`,{className:`rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2`,children:[(0,D.jsx)(`p`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-400`,children:`Party Details`}),(0,D.jsx)(`p`,{className:`font-semibold text-surface-900 dark:text-surface-50`,children:k.party_name}),(0,D.jsx)(`p`,{className:`text-sm text-surface-500`,children:k.party_city}),(0,D.jsxs)(`p`,{className:`text-xs text-surface-400 flex items-center gap-1`,children:[(0,D.jsx)(y,{className:`h-3.5 w-3.5`}),` `,k.region]})]}),(0,D.jsxs)(`div`,{className:`rounded-xl bg-surface-50 dark:bg-surface-700/40 border border-surface-200 dark:border-surface-700 p-4 space-y-2`,children:[(0,D.jsx)(`p`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-400`,children:`Dispatch Info`}),(0,D.jsxs)(`p`,{className:`text-sm text-surface-700 dark:text-surface-300`,children:[(0,D.jsx)(`span`,{className:`text-surface-400 text-xs`,children:`Dispatched By: `}),k.dispatched_by]}),(0,D.jsxs)(`p`,{className:`text-sm text-surface-700 dark:text-surface-300`,children:[(0,D.jsx)(`span`,{className:`text-surface-400 text-xs`,children:`Vehicle: `}),k.vehicle_no]}),(0,D.jsxs)(`p`,{className:`text-sm text-surface-700 dark:text-surface-300`,children:[(0,D.jsx)(`span`,{className:`text-surface-400 text-xs`,children:`Driver: `}),k.driver]})]})]}),(0,D.jsxs)(`div`,{children:[(0,D.jsx)(`p`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-400 mb-2`,children:`Dispatched Items`}),(0,D.jsx)(`div`,{className:`overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700`,children:(0,D.jsxs)(`table`,{className:`w-full min-w-[600px] text-sm text-left border-collapse`,children:[(0,D.jsx)(`thead`,{className:`bg-surface-50 dark:bg-surface-700/50`,children:(0,D.jsxs)(`tr`,{className:`text-xs font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400`,children:[(0,D.jsx)(`th`,{className:`px-4 py-2.5`,children:`#`}),(0,D.jsx)(`th`,{className:`px-4 py-2.5`,children:`Part No`}),(0,D.jsx)(`th`,{className:`px-4 py-2.5`,children:`Item`}),(0,D.jsx)(`th`,{className:`px-4 py-2.5 text-right`,children:`Qty`}),(0,D.jsx)(`th`,{className:`px-4 py-2.5`,children:`Unit`})]})}),(0,D.jsx)(`tbody`,{className:`divide-y divide-surface-100 dark:divide-surface-700`,children:k.items.map((e,t)=>(0,D.jsxs)(`tr`,{className:`table-row-hover`,children:[(0,D.jsx)(`td`,{className:`px-4 py-2.5 text-surface-400`,children:t+1}),(0,D.jsx)(`td`,{className:`px-4 py-2.5 font-mono text-xs text-primary-600 dark:text-primary-400`,children:e.sku}),(0,D.jsx)(`td`,{className:`px-4 py-2.5 font-medium text-surface-900 dark:text-surface-50`,children:e.name}),(0,D.jsx)(`td`,{className:`px-4 py-2.5 text-right font-semibold`,children:e.qty}),(0,D.jsx)(`td`,{className:`px-4 py-2.5 text-surface-500`,children:e.unit})]},e.sku))}),(0,D.jsx)(`tfoot`,{children:(0,D.jsxs)(`tr`,{className:`bg-surface-50 dark:bg-surface-700/50 font-semibold text-sm`,children:[(0,D.jsx)(`td`,{colSpan:3,className:`px-4 py-2.5 text-surface-600 dark:text-surface-300`,children:`Total`}),(0,D.jsx)(`td`,{className:`px-4 py-2.5 text-right text-surface-900 dark:text-surface-50`,children:k.total_qty}),(0,D.jsx)(`td`,{className:`px-4 py-2.5`})]})})]})})]}),(0,D.jsxs)(`div`,{className:`flex justify-end gap-3 pt-2 border-t border-surface-100 dark:border-surface-700`,children:[(0,D.jsx)(h,{variant:`secondary`,onClick:()=>N(null),id:`challan-modal-close`,children:`Close`}),e&&(0,D.jsxs)(D.Fragment,{children:[(0,D.jsx)(h,{variant:`secondary`,icon:o,onClick:()=>j(k),id:`challan-modal-download`,children:`Download HTML`}),(0,D.jsx)(h,{icon:c,onClick:()=>A(k),id:`challan-modal-print`,children:`Print`})]})]})]})})]})}export{N as default};