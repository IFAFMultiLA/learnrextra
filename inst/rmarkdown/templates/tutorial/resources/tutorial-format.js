(()=>{var ke=Object.defineProperty;var ne=Object.getOwnPropertySymbols;var Se=Object.prototype.hasOwnProperty,Te=Object.prototype.propertyIsEnumerable;var ie=(u,l,d)=>l in u?ke(u,l,{enumerable:!0,configurable:!0,writable:!0,value:d}):u[l]=d,U=(u,l)=>{for(var d in l||(l={}))Se.call(l,d)&&ie(u,d,l[d]);if(ne)for(var d of ne(l))Te.call(l,d)&&ie(u,d,l[d]);return u};var oe=(u,l,d)=>new Promise((y,r)=>{var x=C=>{try{I(d.next(C))}catch(k){r(k)}},q=C=>{try{I(d.throw(C))}catch(k){r(k)}},I=C=>C.done?y(C.value):Promise.resolve(C.value).then(x,q);I((d=d.apply(u,l)).next())});function ae(u,l,d){let y="";typeof d=="string"&&(y=`<div class="section_ref">${tr.chatview_section_reference}</div>`);let r=`<div class="msg ${u}">${nl2br(l)}${y}</div>`;$("#chatview > .messages").append(r);let x=$("#chatview > .messages > .msg.user:last")[0];MathJax.Hub.Queue(["Typeset",MathJax.Hub,x])}function se(u,l){ae("system",u,l),$("#chatview > .controls > button").attr("disabled",!1)}function _e(u){$("#chatview > .controls > button").attr("disabled",!0),ae("user",u)}function ce(u){clearInterval(u),$("#chatview > .messages > .msg.system.pending").remove()}$(document).ready(function(){let u="",l=-1,d=!1,y=!1,r=[],x=_.defaults(sessdata.app_config,{summary:!0,reset_button:!0,chatbot:!1}),q=_.defaults(x.summary,!0).valueOf(),I=_.defaults(x.reset_button,!0).valueOf(),C=_.defaults(x.chatbot,!1).valueOf(),k=new Set,E=!1,z=0,le=["h2","h3","h4","h5","h6","p","ul","ol","div.figure","div.section"],re=["summary","tracking_consent_text","data_protection_text"],ue=le.map(e=>".section.level2 > "+e).join(", "),J=0;$(ue).each(function(e,t){let n=$(t);re.map(i=>n.hasClass(i)).reduce((i,a)=>i+a,0)===0&&(n.prop("id",`mainContentElem-${J}`).addClass("mainContentElem"),J++)});let de=function(){return oe(this,null,function*(){let e=$("#chatview > .controls > button").attr("disabled")!=="disabled",t=$("#chatview > .controls > textarea"),n=t.val().trim();if(n!==""&&e){_e(n),t.val(""),$("#chatview > .messages").append('<div class="msg system pending">.</div>');let o=setInterval(function(){let i=$("#chatview > .messages > .msg.system.pending"),a=i.text().length%3+1;i.text(".".repeat(a))},500);try{yield postChatbotMessage(sess,tracking_session_id,sessdata.user_code,n).then(i=>{if(i.ok)return i.json();throw new Error("Posting the chat message failed.")}).then(function(i){ce(o),se(i.message,i.content_section),typeof i.content_section=="string"&&$("#chatview > .messages > .msg:last > .section_ref").on("click",function(){console.log("highlight section",i.content_section),T(l,i.content_section);let a=$(`#${i.content_section}`);a.css({backgroundColor:"white"}).animate({backgroundColor:"gold"},{complete:function(){a.animate({backgroundColor:"white"})}})})})}catch(i){ce(o),se("Sorry, there is currently a problem with the learning assistant service."),console.log("error communicating with the chat service:",i)}}})};C?($("#chatview").show(),$("#chatview > .header").on("click",function(){$("#chatview").hasClass("opened")?$("#chatview").removeClass("opened").addClass("closed"):$("#chatview").removeClass("closed").addClass("opened")}),$("#chatview > .controls > button").on("click",de)):$("#chatview").hide();let R=function(){let e=[];return{add:function(t,n){e.push({id:t,callback:n})},remove:function(t){e=e.filter(function(n){return t!==n.id})},invoke:function(){for(let t=0;t<e.length;t++)e[t].callback()}}}();function H(e,t){if(typeof t=="undefined"&&(t=!0),r.length===0||(e=e*1,e===l))return;if(l!==-1){let o=$(r[l].jqElement);o.trigger("hide"),o.removeClass("current"),o.trigger("hidden"),$(r[l].jqListElement).removeClass("current")}let n=$(r[e].jqElement);n.trigger("show"),n.addClass("current"),n.trigger("shown"),$(r[e].jqListElement).addClass("current"),l=e,t&&R.invoke(),setTimeout(function(){$(document).scrollTop(0)},0)}function T(e,t){let n=window.location.href.replace(window.location.hash,"");if(window.location=`${n}#${r[e].id}`,t===void 0)$("#learnr-tutorial-content").parent().scrollTop(0);else{let o=$(`#${t}`)[0],i=Math.max(o.offsetTop-o.offsetHeight-120,0);$("#learnr-tutorial-content").parent().scrollTop(i)}A(e-1)}function fe(e){Q(),T(this.getAttribute("index"))}function pe(){$(".topicsList").removeClass("hideFloating")}function Q(){$(".topicsList").addClass("hideFloating")}function D(e){Y();let t=r[e];if(!t.progressiveReveal)return;let n=!0,o=null;for(let i=0;i<t.sections.length;i++){let a=t.sections[i],s=$(a.jqElement);n?(s.trigger("show"),s.removeClass("hide"),s.trigger("shown"),a.skipped?s.removeClass("showSkip"):(s.addClass("showSkip"),o=s)):(s.trigger("hide"),s.addClass("hide"),s.trigger("hidden")),n=n&&a.skipped}!t.progressiveReveal||n?$(t.jqElement).removeClass("hideActions"):$(t.jqElement).addClass("hideActions"),E&&o&&(z=o.offset().top-28,setTimeout(function(){$("html, body").animate({scrollTop:z},300)},60)),E=!1}function V(e){let t=r[e],n=t.sections.length===0?!t.topicCompleted*100:(1-t.sectionsSkipped/t.sections.length)*100;$(t.jqListElement).css("background-position-y",n+"%")}function F(e){return i18next.language||window.localStorage.i18nextLng||e||"en"}function he(e){$(this).data("n_clicks",$(this).data("n_clicks")+1);let t=this.getAttribute("data-section-id"),n=-1,o=-1,i,a;if($.each(r,function(s,c){return $.each(c.sections,function(p,g){if(t===g.id)return n=s,o=p,i=c,a=g,!1}),n===-1}),a.exercises.length&&!a.completed&&!a.allowSkip){let s=i18next.t(["text.exercise","exercise"],{count:a.exercises.length,lngs:[F(),"en"]}),c=i18next.t(["text.youmustcomplete","You must complete the"]),p=i18next.t(["text.inthissection","in this section before continuing."]);bootbox.setLocale(F()),bootbox.alert(c+" "+s+" "+p)}else o===i.sections.length-1?n<r.length-1&&T(l+1):E=!0,Z([a.jqElement]),tutorial.skipSection(t)}function me(e){r[l].sections.length===0&&tutorial.skipSection(r[l].id),A(l),T(l+1)}function ge(e){T(l-1)}function $e(){let e=$('<nav id="tutorial-topic" class="topicsList hideFloating" aria-label="topic"></nav>'),t=$('<header class="topicsHeader"></header>'),n=$('<div class="paneCloser"></div>');n.on("click",Q),t.append(n),e.append(t);let o=N()?$('<ul class="nav nav-pills" role="menubar" aria-orientation="vertical" aria-label="topic"></ul>'):$('<ul class="nav flex-column" role="menubar" aria-orientation="vertical" aria-label="topic"></ul>');e.append(o),$("#doc-metadata").before(e),Y();let i=$(".section.level2");if(i.each(function(a,s){let c={};c.id=$(s).attr("id"),c.exercisesCompleted=0,c.sectionsCompleted=0,c.sectionsSkipped=0,c.topicCompleted=!1,c.jqElement=s,c.jqTitleElement=$(s).children("h2")[0],c.titleText=c.jqTitleElement.innerText;let p=$(s).attr("data-progressive");typeof p!="undefined"&&p!==!1?c.progressiveReveal=p==="true"||p==="TRUE":c.progressiveReveal=d;let g=$(`<li class="topic${N()?"":" nav-item"}" index="${a}"><a href="#${c.id}" class = "nav-link" role="menuitem" tabindex="0">${c.titleText}</a></li>`);g.on("click",fe),c.jqListElement=g,$(o).append(g);let h=$('<div class="topicActions"></div>');if(a>0){let v=$('<button class="btn btn-default" data-i18n="button.previoustopic">Previous Topic</button>');v.on("click",ge),h.append(v)}if(a<i.length-1){let v=$('<button class="btn btn-primary" data-i18n="button.nexttopic">Next Topic</button>');v.on("click",me),h.append(v)}$(s).append(h),$(s).on("shown",function(){$(this).is(":visible")&&$(s).children(".section.level3").each(function(f,m){j(m)})}),$(s).on("hidden",function(){$(s).children(".section.level3").each(function(f,m){j(m)})}),c.sections=[],$(s).children(".section.level3").each(function(v,f){if(c.progressiveReveal){let M='data-i18n="button.continue"',w="Continue";f.dataset.continueText&&(w=f.dataset.continueText,M="");let b=$(`<button
              class="btn btn-default skip"
              id="continuebutton-${f.id}"
              data-section-id="${f.id}"
              ${M}
            >${w}</button>`);b.data("n_clicks",0),b.on("click",he);let te=$('<div class="exerciseActions"></div>');te.append(b),$(f).append(te)}$(f).on("shown",function(){j(f)}),$(f).on("hidden",function(){j(f)});let m={};m.exercises=[],$(f).children(".tutorial-exercise").each(function(M,w){let b={};b.dataLabel=$(w).attr("data-label"),b.completed=!1,b.jqElement=w,m.exercises.push(b)});let L=$(f).attr("data-allow-skip"),B=y;typeof L!="undefined"&&L!==!1&&(B=L="true"),m.id=f.id,m.completed=!1,m.allowSkip=B,m.skipped=!1,m.jqElement=f,c.sections.push(m)}),r.push(c)}),I){let a=$('<li class="resetButton"><a href="#" data-i18n="text.startover">Start Over</a></li>');a.on("click",function(){let s=i18next.t(["text.areyousure","Are you sure you want to start over? (all exercise progress will be reset)"]);bootbox.setLocale(F()),bootbox.confirm(s,function(c){c&&tutorial.startOver()})}),$("#doc-metadata-additional ul").prepend(a)}return e}let W=new Shiny.InputBinding;$.extend(W,{find:function(e){return $(e).find(".topicsList")},getValue:function(e){return l===-1?null:r[l].id},setValue:function(e,t){for(let n=0;n<r.length;n++)if(r[n].id===t){H(n,!1);break}},subscribe:function(e,t){R.add(e.id,t)},unsubscribe:function(e){R.remove(e.id)}}),Shiny.inputBindings.register(W,"learnr.topicMenuInputBinding");let K=new Shiny.InputBinding;$.extend(K,{find:function(e){return $(e).find(".exerciseActions > button.skip")},getId:function(e){return"continuebutton-"+e.getAttribute("data-section-id")},getValue:function(e){return $(e).data("n_clicks")},setValue:function(e,t){let n=$(e).data("n_clicks");t>n&&$(e).trigger("click"),$(e).data("n_clicks",t)},subscribe:function(e,t){$(e).on("click.continueButtonInputBinding",function(n){t(!1)})},unsubscribe:function(e){$(e).off(".continueButtonInputBinding")}}),Shiny.inputBindings.register(K,"learnr.continueButtonInputBinding");function ve(){u=$("title")[0].innerText;let e=$("meta[name=progressive]").attr("content");d=e==="true"||e==="TRUE";let t=$("meta[name=allow-skip]").attr("content");y=t==="true"||t==="TRUE";let n=$(`<h1 class="tutorialTitle">${u}</h1>`);n.on("click",pe),$(".topics").prepend(n),$(".bandContent.topicsListContainer").append($e());for(let i=0;i<r.length;i++)D(i);be();function o(){$(".topicsList").css("max-height",window.innerHeight)}o(),window.addEventListener("resize",o)}function be(){$(".footnote-ref").replaceWith(function(){let e=$("<span>");return e.addClass($(this).class),e.append($(this).html()),e}),$(".footnote-back").remove()}function N(){return!window.bootstrap}function we(){if(N())return;document.querySelectorAll(".btn-xs").forEach(n=>{n.classList.remove("btn-xs"),n.classList.add("btn-sm")}),document.querySelectorAll(".sr-only").forEach(n=>{n.classList.contains("visually-hidden-focusable")||n.classList.add("visually-hidden")});let e={panel:"card","panel-default":"","panel-heading":"card-header","panel-title":"card-title","panel-body":"card-body","panel-footer":"card-footer"},t=document.querySelectorAll(".tutorial-exercise-input, .tutorial-question-container");t.length!==0&&t.forEach(n=>{Object.keys(e).forEach(o=>{let i=[n,...n.querySelectorAll(`.${o}`)];if(!i.length)return;let a=e[o];i.forEach(s=>{!s.classList.contains(o)||(s.classList.remove(o),a!==""&&s.classList.add(a))})})})}function Ce(){function e(){let t=window.decodeURIComponent(window.location.hash),n=0;return t.length>0&&$.each(r,function(o,i){if("#"+i.id===t)return n=o,!1}),n}H(e()),A(l-1),window.addEventListener("popstate",function(t){H(e())})}function ye(e){let t=$(e),n=t.hasClass("level2"),o;n?o=t.attr("id"):o=$(t.parents(".section.level2")).attr("id");let i=-1;if($.each(r,function(s,c){if(c.id===o)return i=s,!1}),i===-1){console.log('topic "'+o+'" not found');return}let a=r[i];if(n)a.topicCompleted=!0,V(i);else{let s=-1,c=t.attr("id");if($.each(a.sections,function(g,h){if(h.id===c)return s=g,!1}),s===-1){console.log('completed section"'+c+'"not found');return}let p=a.sections[s];p.completed||(a.sectionsCompleted++,V(i),$(p.jqElement).addClass("done"),p.completed=!0,D(i))}}let S=[];function Y(){S.splice(0,S.length),P()}function j(e){let t=S.indexOf(e.id);$(e).is(":visible")?t===-1&&(S.push(e.id),P()):t!==-1&&(S.splice(t,1),P())}function P(){Shiny&&Shiny.setInputValue?Shiny.setInputValue("tutorial-visible-sections",S):$(document).on("shiny:sessioninitialized",function(){Shiny.setInputValue("tutorial-visible-sections",S)})}function Z(e){let t;if(e.length)t=e[0].id;else{console.log("section "+$(e).selector.split('"')[1]+" not found");return}let n=-1;$.each(r,function(o,i){return t===i.id?(n=o,i.topicCompleted=!0,!1):($.each(i.sections,function(a,s){if(t===s.id)return n=o,s.skipped=!0,i.sectionsSkipped++,!1}),n===-1)}),V(n),D(n)}function xe(e){let t=0,n=0,o=e.length;for(;n<o;)t=(t<<5)-t+e.charCodeAt(n++)<<0;return t+2147483647+1}function G(e,t){if(!q)return;let n=$(".parallellayout.col.main"),o=$(".parallellayout.col.side");if(!o.is(":visible")){let c={dontShowAgain:!0};if(config.language==="de"){let p={nextLabel:"Weiter",prevLabel:"Zur\xFCck",doneLabel:"Fertig",stepNumbersOfLabel:"von",dontShowAgainLabel:"Nicht wieder anzeigen"};c=U(U({},c),p)}n.css("flexBasis","100%"),o.css("flexBasis","0%"),o.show(),o.animate({flexBasis:"30%"},{duration:1e3,step:function(p,g){n.css("flexBasis",100-p+"%")},complete:function(){tracking_config.summary&&postEvent(sess,tracking_session_id,sessdata.user_code,"summary_shown"),MathJax.Hub.Queue(["Rerender",MathJax.Hub]),$(".shiny-plot-output").each(()=>Shiny.renderContent(this.id)),introJs().setOptions(c).start()}})}let i=`${e}.${t}`,a=$("#summarytext"),s=null;if(!k.has(i)){let c=$(`.section.level2:eq(${e})  .summary:eq(${t})`),p=c.prevAll(".mainContentElem").first()||c.nextAll(".mainContentElem").first();s=c.prop("id");let g=c.children().detach(),h=null,O=!1;for(let f=0;f<g.length;f++){let m=g[f],ee=$(m).hasClass("replace")||c.hasClass("replace"),L=m.tagName==="DIV"?$(m).children():[m];for(let B=0;B<L.length;B++){let M=L[B],w=$(M);if(M.tagName==="H4"){h!==null&&(h.css("opacity","0%").animate({opacity:"100%"},{duration:1e3}),a.append(h));let b="summaryContainer_"+xe(w.text());w.on("click",function(){T(e,p.length?p.prop("id"):void 0)}),h=a.find("."+b),h.length===0&&(h=$(`<div class="${b}"></div>`),h.append(w),O=!0)}else h!==null?(ee&&h.find(":not(h4)").remove(),h.append(w)):console.error("invalid summary definition (no summary section provided before)");h!==null&&f>=g.length-1&&(h.css("opacity","0%").animate({opacity:"100%"},{duration:1e3}),O&&(a.append(h),O=!1))}}tracking_config.summary&&postEvent(sess,tracking_session_id,sessdata.user_code,"summary_topic_added",{key:i,id:s});let v=a.parent();v.animate({scrollTop:v.prop("scrollHeight")},1e3),k.add(i)}}function A(e){if(!!q)for(let t=0;t<=e;t++){let n=$(`.section.level2:eq(${t})`).find(".summary");for(let o=0;o<n.length;o++)k.has(`${t}.${o}`)||G(t,o)}}function X(e){let t=Math.floor(e-$(".topicsContainer").height());$(".parallellayout.row").height(t-24)}q&&($(".parallellayout.col.main").scroll(function(){let e=$(`.section.level2:eq(${l})`).find(".summary"),t=$(".bandContent.topicsListContainer").height();e.each(function(o,i){i.getBoundingClientRect().bottom<t&&G(l,o)});let n=this.scrollHeight-this.clientHeight;this.scrollTop>=n-10&&A(l)}),$(window).on("hashchange",function(){A(l-1)})),$(window).on("resize",function(){X($(this).height())}),we(),ve(),Ce(),X($(window).height()),setTimeout(function(){$(".btn-tutorial-run").removeClass("disabled")},5e3),tutorial.onInit(function(){tutorial.onProgress(function(e){e.event==="section_completed"?ye(e.element):e.event==="section_skipped"&&Z(e.element)})})});})();
//# sourceMappingURL=tutorial-format.js.map
