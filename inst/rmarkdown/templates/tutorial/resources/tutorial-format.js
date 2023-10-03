(()=>{$(document).ready(function(){let w="",d=-1,V=!1,D=!1,r=[],R={},F=new Set,y=!1,_=0,S=function(){let t=[];return{add:function(e,n){t.push({id:e,callback:n})},remove:function(e){t=t.filter(function(n){return e!==n.id})},invoke:function(){for(let e=0;e<t.length;e++)t[e].callback()}}}();function C(t,e){if(typeof e=="undefined"&&(e=!0),r.length===0||(t=t*1,t===d))return;if(d!==-1){let i=$(r[d].jqElement);i.trigger("hide"),i.removeClass("current"),i.trigger("hidden"),$(r[d].jqListElement).removeClass("current")}let n=$(r[t].jqElement);n.trigger("show"),n.addClass("current"),n.trigger("shown"),$(r[t].jqListElement).addClass("current"),d=t,e&&S.invoke(),setTimeout(function(){$(document).scrollTop(0)},0)}function v(t){let e=window.location.href.replace(window.location.hash,"");window.location=`${e}#${r[t].id}`}function W(t){H(),v(this.getAttribute("index"))}function Y(){$(".topicsList").removeClass("hideFloating")}function H(){$(".topicsList").addClass("hideFloating")}function T(t){N();let e=r[t];if(!e.progressiveReveal)return;let n=!0,i=null;for(let o=0;o<e.sections.length;o++){let c=e.sections[o],s=$(c.jqElement);n?(s.trigger("show"),s.removeClass("hide"),s.trigger("shown"),c.skipped?s.removeClass("showSkip"):(s.addClass("showSkip"),i=s)):(s.trigger("hide"),s.addClass("hide"),s.trigger("hidden")),n=n&&c.skipped}!e.progressiveReveal||n?$(e.jqElement).removeClass("hideActions"):$(e.jqElement).addClass("hideActions"),y&&i&&(_=i.offset().top-28,setTimeout(function(){$("html, body").animate({scrollTop:_},300)},60)),y=!1}function L(t){let e=r[t],n=e.sections.length===0?!e.topicCompleted*100:(1-e.sectionsSkipped/e.sections.length)*100;$(e.jqListElement).css("background-position-y",n+"%")}function B(t){return i18next.language||window.localStorage.i18nextLng||t||"en"}function G(t){$(this).data("n_clicks",$(this).data("n_clicks")+1);let e=this.getAttribute("data-section-id"),n=-1,i=-1,o,c;if($.each(r,function(s,a){return $.each(a.sections,function(l,h){if(e===h.id)return n=s,i=l,o=a,c=h,!1}),n===-1}),c.exercises.length&&!c.completed&&!c.allowSkip){let s=i18next.t(["text.exercise","exercise"],{count:c.exercises.length,lngs:[B(),"en"]}),a=i18next.t(["text.youmustcomplete","You must complete the"]),l=i18next.t(["text.inthissection","in this section before continuing."]);bootbox.setLocale(B()),bootbox.alert(a+" "+s+" "+l)}else i===o.sections.length-1?n<r.length-1&&v(d+1):y=!0,z([c.jqElement]),tutorial.skipSection(e)}function J(t){r[d].sections.length===0&&tutorial.skipSection(r[d].id),v(d+1)}function Q(t){v(d-1)}function X(){let t=$('<nav id="tutorial-topic" class="topicsList hideFloating" aria-label="topic"></nav>'),e=$('<header class="topicsHeader"></header>');e.append($('<h1 class="tutorialTitle">'+w+"</h1>"));let n=$('<div class="paneCloser"></div>');n.on("click",H),e.append(n),t.append(e);let i=q()?$('<ul class="nav nav-pills" role="menubar" aria-orientation="vertical" aria-label="topic"></ul>'):$('<ul class="nav flex-column" role="menubar" aria-orientation="vertical" aria-label="topic"></ul>');t.append(i),$("#doc-metadata").before(t),N();let o=$(".section.level2");o.each(function(s,a){let l={};l.id=$(a).attr("id"),l.exercisesCompleted=0,l.sectionsCompleted=0,l.sectionsSkipped=0,l.topicCompleted=!1,l.jqElement=a,l.jqTitleElement=$(a).children("h2")[0],l.titleText=l.jqTitleElement.innerText;let h=$(a).attr("data-progressive");typeof h!="undefined"&&h!==!1?l.progressiveReveal=h==="true"||h==="TRUE":l.progressiveReveal=V;let k=$(a).find(".summary");k.each(function(p,u){p+1===k.length&&(R[s]=p)});let A=$(`<li class="topic${q()?"":" nav-item"}" index="${s}"><a href="#${l.id}" class = "nav-link" role="menuitem" tabindex="0">${l.titleText}</a></li>`);A.on("click",W),l.jqListElement=A,$(i).append(A);let j=$('<div class="topicActions"></div>');if(s>0){let p=$('<button class="btn btn-default" data-i18n="button.previoustopic">Previous Topic</button>');p.on("click",Q),j.append(p)}if(s<o.length-1){let p=$('<button class="btn btn-primary" data-i18n="button.nexttopic">Next Topic</button>');p.on("click",J),j.append(p)}$(a).append(j),$(a).on("shown",function(){$(this).is(":visible")&&$(a).children(".section.level3").each(function(u,f){x(f)})}),$(a).on("hidden",function(){$(a).children(".section.level3").each(function(u,f){x(f)})}),l.sections=[],$(a).children(".section.level3").each(function(p,u){if(l.progressiveReveal){let O='data-i18n="button.continue"',b="Continue";u.dataset.continueText&&(b=u.dataset.continueText,O="");let g=$(`<button
              class="btn btn-default skip"
              id="continuebutton-${u.id}"
              data-section-id="${u.id}"
              ${O}
            >${b}</button>`);g.data("n_clicks",0),g.on("click",G);let K=$('<div class="exerciseActions"></div>');K.append(g),$(u).append(K)}$(u).on("shown",function(){x(u)}),$(u).on("hidden",function(){x(u)});let f={};f.exercises=[],$(u).children(".tutorial-exercise").each(function(O,b){let g={};g.dataLabel=$(b).attr("data-label"),g.completed=!1,g.jqElement=b,f.exercises.push(g)});let M=$(u).attr("data-allow-skip"),E=D;typeof M!="undefined"&&M!==!1&&(E=M="true"),f.id=u.id,f.completed=!1,f.allowSkip=E,f.skipped=!1,f.jqElement=u,l.sections.push(f)}),r.push(l)});let c=$('<li class="resetButton"><a href="#" data-i18n="text.startover">Start Over</a></li>');return c.on("click",function(){let s=i18next.t(["text.areyousure","Are you sure you want to start over? (all exercise progress will be reset)"]);bootbox.setLocale(B()),bootbox.confirm(s,function(a){a&&tutorial.startOver()})}),$("#doc-metadata-additional ul").prepend(c),t}let P=new Shiny.InputBinding;$.extend(P,{find:function(t){return $(t).find(".topicsList")},getValue:function(t){return d===-1?null:r[d].id},setValue:function(t,e){for(let n=0;n<r.length;n++)if(r[n].id===e){C(n,!1);break}},subscribe:function(t,e){S.add(t.id,e)},unsubscribe:function(t){S.remove(t.id)}}),Shiny.inputBindings.register(P,"learnr.topicMenuInputBinding");let U=new Shiny.InputBinding;$.extend(U,{find:function(t){return $(t).find(".exerciseActions > button.skip")},getId:function(t){return"continuebutton-"+t.getAttribute("data-section-id")},getValue:function(t){return $(t).data("n_clicks")},setValue:function(t,e){let n=$(t).data("n_clicks");e>n&&$(t).trigger("click"),$(t).data("n_clicks",e)},subscribe:function(t,e){$(t).on("click.continueButtonInputBinding",function(n){e(!1)})},unsubscribe:function(t){$(t).off(".continueButtonInputBinding")}}),Shiny.inputBindings.register(U,"learnr.continueButtonInputBinding");function Z(){w=$("title")[0].innerText;let t=$("meta[name=progressive]").attr("content");V=t==="true"||t==="TRUE";let e=$("meta[name=allow-skip]").attr("content");D=e==="true"||e==="TRUE";let n=$(`<h1 class="tutorialTitle">${w}</h1>`);n.on("click",Y),$(".topics").prepend(n),$(".bandContent.topicsListContainer").append(X());for(let o=0;o<r.length;o++)T(o);tt();function i(){$(".topicsList").css("max-height",window.innerHeight)}i(),window.addEventListener("resize",i)}function tt(){$(".footnote-ref").replaceWith(function(){let t=$("<span>");return t.addClass($(this).class),t.append($(this).html()),t}),$(".footnote-back").remove()}function q(){return!window.bootstrap}function et(){if(q())return;document.querySelectorAll(".btn-xs").forEach(n=>{n.classList.remove("btn-xs"),n.classList.add("btn-sm")}),document.querySelectorAll(".sr-only").forEach(n=>{n.classList.contains("visually-hidden-focusable")||n.classList.add("visually-hidden")});let t={panel:"card","panel-default":"","panel-heading":"card-header","panel-title":"card-title","panel-body":"card-body","panel-footer":"card-footer"},e=document.querySelectorAll(".tutorial-exercise-input, .tutorial-question-container");e.length!==0&&e.forEach(n=>{Object.keys(t).forEach(i=>{let o=[n,...n.querySelectorAll(`.${i}`)];if(!o.length)return;let c=t[i];o.forEach(s=>{!s.classList.contains(i)||(s.classList.remove(i),c!==""&&s.classList.add(c))})})})}function nt(){function t(){let e=window.decodeURIComponent(window.location.hash),n=0;return e.length>0&&$.each(r,function(i,o){if("#"+o.id===e)return n=i,!1}),n}C(t()),window.addEventListener("popstate",function(e){C(t())})}function it(t){let e=$(t),n=e.hasClass("level2"),i;n?i=e.attr("id"):i=$(e.parents(".section.level2")).attr("id");let o=-1;if($.each(r,function(s,a){if(a.id===i)return o=s,!1}),o===-1){console.log('topic "'+i+'" not found');return}let c=r[o];if(n)c.topicCompleted=!0,L(o);else{let s=-1,a=e.attr("id");if($.each(c.sections,function(h,k){if(k.id===a)return s=h,!1}),s===-1){console.log('completed section"'+a+'"not found');return}let l=c.sections[s];l.completed||(c.sectionsCompleted++,L(o),$(l.jqElement).addClass("done"),l.completed=!0,T(o))}}let m=[];function N(){m.splice(0,m.length),I()}function x(t){let e=m.indexOf(t.id);$(t).is(":visible")?e===-1&&(m.push(t.id),I()):e!==-1&&(m.splice(e,1),I())}function I(){Shiny&&Shiny.setInputValue?Shiny.setInputValue("tutorial-visible-sections",m):$(document).on("shiny:sessioninitialized",function(){Shiny.setInputValue("tutorial-visible-sections",m)})}function z(t){let e;if(t.length)e=t[0].id;else{console.log("section "+$(t).selector.split('"')[1]+" not found");return}let n=-1;$.each(r,function(i,o){return e===o.id?(n=i,o.topicCompleted=!0,!1):($.each(o.sections,function(c,s){if(e===s.id)return n=i,s.skipped=!0,o.sectionsSkipped++,!1}),n===-1)}),L(n),T(n)}function ot(t){function e(){let o=`${d}.${t}`;if(!F.has(o)){console.log(o);let c=$(`.section.level2:eq(${d})  .summary:eq(${t})`).detach().children();c.css("opacity","0%").css("background-color","white"),$("#summarytext").append(c),c.animate({opacity:"100%",backgroundColor:"yellow"},{duration:1e3,complete:function(){c.animate({backgroundColor:"white"})}}),F.add(o)}}let n=$(".parallellayout.col.main"),i=$(".parallellayout.col.side");i.is(":animated")||(i.is(":visible")?e():(n.css("flexBasis","100%"),i.css("flexBasis","0%"),i.show(),i.animate({flexBasis:"30%"},{duration:1e3,step:function(o,c){n.css("flexBasis",100-o+"%")},complete:e})))}$(".parallellayout.col.main").scroll(function(){let t=this.scrollHeight-this.clientHeight;if(this.scrollTop>=t-10){let e=R[d];e!==void 0&&ot(e)}}),et(),Z(),nt(),tutorial.onInit(function(){tutorial.onProgress(function(t){t.event==="section_completed"?it(t.element):t.event==="section_skipped"&&z(t.element)})})});})();
//# sourceMappingURL=tutorial-format.js.map
