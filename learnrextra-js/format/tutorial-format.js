/* global _,$,tutorial,Shiny,i18next,bootbox,introJs,sessdata,config,MathJax,postEvent,sess,tracking_session_id,
   sessdata,tracking_config,nl2br,postChatbotMessage,tr */

function pushChatMessage (role, msg, contentSection) {
  let sectionRefHTML = ''
  if (typeof contentSection === 'string') {
    sectionRefHTML = `<div class="section_ref">${tr.chatview_section_reference}</div>`
  }

  const newElem = `<div class="msg ${role}">${nl2br(msg)}${sectionRefHTML}</div>`
  $('#chatview > .messages').append(newElem)

  const newMsgElem = $('#chatview > .messages > .msg.user:last')[0]
  MathJax.Hub.Queue(['Typeset', MathJax.Hub, newMsgElem])
}

function pushSystemChatMessage (msg, contentSection) {
  pushChatMessage('system', msg, contentSection)
  $('#chatview > .controls > button').attr('disabled', false)
}

function pushUserChatMessage (msg) {
  $('#chatview > .controls > button').attr('disabled', true)
  pushChatMessage('user', msg)
}

function stopChatPendingIndicator (intervalID) {
  clearInterval(intervalID)
  $('#chatview > .messages > .msg.system.pending').remove()
}

$(document).ready(function () {
  let titleText = ''
  let currentTopicIndex = -1
  let docProgressiveReveal = false
  let docAllowSkip = false
  const topics = []
  const appConfig = _.defaults(sessdata.app_config, { summary: true, reset_button: true, chatbot: false })
  // stupid javascript somehow requires "valueOf()" because `_.defaults(..., true)` returns a Boolean object which
  // behaves... strange
  const enableSummaryPanel = _.defaults(appConfig.summary, true).valueOf()
  const enableResetBtn = _.defaults(appConfig.reset_button, true).valueOf()
  const enableChatbot = _.defaults(appConfig.chatbot, false).valueOf()
  const addedSummaries = new Set() // stores keys of "<topicIndex>.<summaryIndex>" of already shown summaries

  let scrollLastSectionToView = false
  let scrollLastSectionPosition = 0

  // set unique ids for each content element to later be able to jump to these
  const contentElemSelectors = ['h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'table', 'div.figure', 'div.section']
  const skipClasses = ['tracking_consent_text', 'data_protection_text']
  const combinedSelector = contentElemSelectors.map(x => '.section.level2 > ' + x).join(', ')
  let mainContentElemIndex = 0
  $(combinedSelector).each(function (i, e) {
    const $e = $(e)
    const anySkipCls = skipClasses.map(cls => $e.hasClass(cls))
      .reduce((accumulator, currentValue) => accumulator + currentValue, 0)
    if (anySkipCls === 0) {
      $e.prop('id', `mainContentElem-${mainContentElemIndex}`).addClass('mainContentElem')
      mainContentElemIndex++
    }
  })

  const handleChatMessageSend = async function () {
    const canSend = $('#chatview > .controls > button').attr('disabled') !== 'disabled'
    const textarea = $('#chatview > .controls > textarea')
    const msg = textarea.val().trim()

    if (msg !== '' && canSend) {
      pushUserChatMessage(msg)
      textarea.val('')
      $('#chatview > .messages').append('<div class="msg system pending">.</div>')
      const pendingIntervalID = setInterval(function () {
        const elem = $('#chatview > .messages > .msg.system.pending')
        const n = (elem.text().length % 3) + 1
        elem.text('.'.repeat(n))
      }, 500)

      try {
        await postChatbotMessage(sess, tracking_session_id, sessdata.user_code, msg)
          .then((response) => {
            if (!response.ok) {
              throw new Error('Posting the chat message failed.')
            } else {
              return response.json()
            }
          })
          .then(function (response) {
            stopChatPendingIndicator(pendingIntervalID)
            pushSystemChatMessage(response.message, response.content_section)

            if (typeof response.content_section === 'string') {
              $('#chatview > .messages > .msg:last > .section_ref').on('click', function () {
                console.log('highlight section', response.content_section)
                const topicIndex = $(`#${response.content_section}`).parent().prop('id')
                updateLocation(topicIndex, response.content_section)
                const sectionElem = $(`#${response.content_section}`)
                sectionElem.css({ backgroundColor: 'white' })
                  .animate({ backgroundColor: 'gold' },
                    {
                      complete: function () {
                        sectionElem.animate({ backgroundColor: 'white' })
                      }
                    })
              })
            }
          })
      } catch (err) {
        stopChatPendingIndicator(pendingIntervalID)
        pushSystemChatMessage('Sorry, there is currently a problem with the learning assistant service.')
        console.log('error communicating with the chat service:', err)
      }
    }
  }

  if (enableChatbot) {
    $('#chatview').show()
    $('#chatview > .header').on('click', function () {
      const opened = $('#chatview').hasClass('opened')

      if (opened) {
        $('#chatview').removeClass('opened').addClass('closed')
      } else {
        $('#chatview').removeClass('closed').addClass('opened')
      }
    })
    $('#chatview > .controls > button').on('click', handleChatMessageSend)
  } else {
    $('#chatview').hide()
  }

  // Callbacks that are triggered when setCurrentTopic() is called.
  const setCurrentTopicNotifiers = (function () {
    let notifiers = []

    return {
      add: function (id, callback) {
        notifiers.push({ id: id, callback: callback })
      },
      remove: function (id) {
        notifiers = notifiers.filter(function (x) {
          return id !== x.id
        })
      },
      invoke: function () {
        for (let i = 0; i < notifiers.length; i++) {
          notifiers[i].callback()
        }
      }
    }
  })()

  function setCurrentTopic (topicIndex, notify) {
    if (typeof notify === 'undefined') {
      notify = true
    }
    if (topics.length === 0) return

    topicIndex = topicIndex * 1 // convert strings to a number

    if (topicIndex === currentTopicIndex) return

    if (currentTopicIndex !== -1) {
      const el = $(topics[currentTopicIndex].jqElement)
      el.trigger('hide')
      el.removeClass('current')
      el.trigger('hidden')
      $(topics[currentTopicIndex].jqListElement).removeClass('current')
    }

    const currentEl = $(topics[topicIndex].jqElement)
    currentEl.trigger('show')
    currentEl.addClass('current')
    currentEl.trigger('shown')
    $(topics[topicIndex].jqListElement).addClass('current')
    currentTopicIndex = topicIndex

    if (notify) {
      setCurrentTopicNotifiers.invoke()
    }

    // always start a topic with a the scroll pos at the top
    // we do this in part to prevent the scroll to view behavior of hash navigation
    setTimeout(function () {
      $(document).scrollTop(0)
    }, 0)
  }

  function updateLocation (topicIndex, scrollToElemID) {
    const baseUrl = window.location.href.replace(window.location.hash, '')
    const topicName = typeof topicIndex === 'string' ? topicIndex : topics[topicIndex].id
    window.location = `${baseUrl}#${topicName}`

    if (scrollToElemID === undefined) {
      // scroll content to top
      $('#learnr-tutorial-content').parent().scrollTop(0)
    } else {
      // scroll to position the element
      const e = $(`#${scrollToElemID}`)[0]
      const scrollTop = Math.max(e.offsetTop - e.offsetHeight - 120, 0)
      $('#learnr-tutorial-content').parent().scrollTop(scrollTop)
    }

    addRemainingSummaries(topicIndex - 1)
  }

  function handleTopicClick (event) {
    hideFloatingTopics()
    updateLocation(this.getAttribute('index'))
  }

  function showFloatingTopics () {
    $('.topicsList').removeClass('hideFloating')
  }

  function hideFloatingTopics () {
    $('.topicsList').addClass('hideFloating')
  }

  function updateVisibilityOfTopicElements (topicIndex) {
    resetSectionVisibilityList()

    const topic = topics[topicIndex]

    if (!topic.progressiveReveal) return

    let showSection = true
    let lastVisibleSection = null

    for (let i = 0; i < topic.sections.length; i++) {
      const section = topic.sections[i]
      const sectionEl = $(section.jqElement)
      if (showSection) {
        sectionEl.trigger('show')
        sectionEl.removeClass('hide')
        sectionEl.trigger('shown')
        if (section.skipped) {
          sectionEl.removeClass('showSkip')
        } else {
          sectionEl.addClass('showSkip')
          lastVisibleSection = sectionEl
        }
      } else {
        sectionEl.trigger('hide')
        sectionEl.addClass('hide')
        sectionEl.trigger('hidden')
      }
      showSection = showSection && section.skipped
    }

    if (!topic.progressiveReveal || showSection) {
      // all sections are visible
      $(topic.jqElement).removeClass('hideActions')
    } else {
      $(topic.jqElement).addClass('hideActions')
    }

    if (scrollLastSectionToView && lastVisibleSection) {
      scrollLastSectionPosition = lastVisibleSection.offset().top - 28
      setTimeout(function () {
        $('html, body').animate(
          {
            scrollTop: scrollLastSectionPosition
          },
          300
        )
      }, 60)
    }
    scrollLastSectionToView = false
  }

  function updateTopicProgressBar (topicIndex) {
    const topic = topics[topicIndex]

    const percentToDo = topic.sections.length === 0
      ? !topic.topicCompleted * 100
      : (1 - topic.sectionsSkipped / topic.sections.length) * 100

    $(topic.jqListElement).css('background-position-y', percentToDo + '%')
  }

  function i18nextLang (fallbackLng) {
    return (
      i18next.language || window.localStorage.i18nextLng || fallbackLng || 'en'
    )
  }

  function handleSkipClick (event) {
    $(this).data('n_clicks', $(this).data('n_clicks') + 1)

    const sectionId = this.getAttribute('data-section-id')
    // get the topic & section indexes
    let topicIndex = -1
    let sectionIndex = -1
    let topic, section
    $.each(topics, function (ti, t) {
      $.each(t.sections, function (si, s) {
        if (sectionId === s.id) {
          topicIndex = ti
          sectionIndex = si
          topic = t
          section = s
          return false
        }
      })
      return topicIndex === -1
    })
    // if the section has exercises and is not complete, don't skip - put up message
    if (section.exercises.length && !section.completed && !section.allowSkip) {
      const exs = i18next.t(['text.exercise', 'exercise'], {
        count: section.exercises.length,
        lngs: [i18nextLang(), 'en']
      })
      const youmustcomplete = i18next.t([
        'text.youmustcomplete',
        'You must complete the'
      ])
      const inthissection = i18next.t([
        'text.inthissection',
        'in this section before continuing.'
      ])

      bootbox.setLocale(i18nextLang())
      bootbox.alert(youmustcomplete + ' ' + exs + ' ' + inthissection)
    } else {
      if (sectionIndex === topic.sections.length - 1) {
        // last section on the page
        if (topicIndex < topics.length - 1) {
          updateLocation(currentTopicIndex + 1)
        }
      } else {
        scrollLastSectionToView = true
      }
      // update UI
      sectionSkipped([section.jqElement])
      // notify server
      tutorial.skipSection(sectionId)
    }
  }

  function handleNextTopicClick (event) {
    // any sections in this topic? if not, mark it as skipped
    if (topics[currentTopicIndex].sections.length === 0) {
      tutorial.skipSection(topics[currentTopicIndex].id)
    }
    addRemainingSummaries(currentTopicIndex)
    updateLocation(currentTopicIndex + 1)
  }

  function handlePreviousTopicClick (event) {
    updateLocation(currentTopicIndex - 1)
  }

  // build the list of topics in the document
  // and create/adorn the DOM for them as needed
  function buildTopicsList () {
    const topicsList = $(
      '<nav id="tutorial-topic" class="topicsList hideFloating" aria-label="topic"></nav>'
    )

    const topicsHeader = $('<header class="topicsHeader"></header>')
    // topicsHeader.append($('<h1 class="tutorialTitle">' + titleText + '</h1>'))
    const topicsCloser = $('<div class="paneCloser"></div>')
    topicsCloser.on('click', hideFloatingTopics)
    topicsHeader.append(topicsCloser)
    topicsList.append(topicsHeader)
    const topicsNav = isBS3()
      ? $('<ul class="nav nav-pills" role="menubar" aria-orientation="vertical" aria-label="topic"></ul>')
      : $('<ul class="nav flex-column" role="menubar" aria-orientation="vertical" aria-label="topic"></ul>')
    topicsList.append(topicsNav)

    $('#doc-metadata').before(topicsList)

    resetSectionVisibilityList()

    const topicsDOM = $('.section.level2')
    topicsDOM.each(function (topicIndex, topicElement) {
      const topic = {}
      topic.id = $(topicElement).attr('id')
      topic.exercisesCompleted = 0
      topic.sectionsCompleted = 0
      topic.sectionsSkipped = 0
      topic.topicCompleted = false // only relevant if topic has 0 exercises
      topic.jqElement = topicElement
      topic.jqTitleElement = $(topicElement).children('h2')[0]
      topic.titleText = topic.jqTitleElement.innerText
      const progressiveAttr = $(topicElement).attr('data-progressive')
      if (
        typeof progressiveAttr !== typeof undefined &&
        progressiveAttr !== false
      ) {
        topic.progressiveReveal =
          progressiveAttr === 'true' || progressiveAttr === 'TRUE'
      } else {
        topic.progressiveReveal = docProgressiveReveal
      }

      const jqTopic = $(
        `<li class="topic${isBS3() ? '' : ' nav-item'}" index="${topicIndex}">` +
        `<a href="#${topic.id}" class = "nav-link" role="menuitem" tabindex="0">${topic.titleText}</a>` +
        '</li>'
      )
      jqTopic.on('click', handleTopicClick)
      topic.jqListElement = jqTopic
      $(topicsNav).append(jqTopic)

      const topicActions = $('<div class="topicActions"></div>')
      if (topicIndex > 0) {
        const prevButton = $(
          '<button class="btn btn-default" data-i18n="button.previoustopic">Previous Topic</button>'
        )
        prevButton.on('click', handlePreviousTopicClick)
        topicActions.append(prevButton)
      }
      if (topicIndex < topicsDOM.length - 1) {
        const nextButton = $(
          '<button class="btn btn-primary" data-i18n="button.nexttopic">Next Topic</button>'
        )
        nextButton.on('click', handleNextTopicClick)
        topicActions.append(nextButton)
      }
      $(topicElement).append(topicActions)

      $(topicElement).on('shown', function () {
        // Some the topic can have the shown event triggered but not actually
        // be visible. This visibility check saves a little effort when it's
        // not actually visible.
        if ($(this).is(':visible')) {
          const sectionsDOM = $(topicElement).children('.section.level3')
          sectionsDOM.each(function (sectionIndex, sectionElement) {
            updateSectionVisibility(sectionElement)
          })
        }
      })

      $(topicElement).on('hidden', function () {
        const sectionsDOM = $(topicElement).children('.section.level3')
        sectionsDOM.each(function (sectionIndex, sectionElement) {
          updateSectionVisibility(sectionElement)
        })
      })

      topic.sections = []
      const sectionsDOM = $(topicElement).children('.section.level3')
      sectionsDOM.each(function (sectionIndex, sectionElement) {
        if (topic.progressiveReveal) {
          let sectionButtonI18n = 'data-i18n="button.continue"'
          let sectionButtonText = 'Continue'

          if (sectionElement.dataset.continueText) {
            // if custom text is specified, set button text
            sectionButtonText = sectionElement.dataset.continueText
            // and remove i18n (otherwise translation overwrites custom text)
            sectionButtonI18n = ''
          }

          const continueButton = $(
            `<button
              class="btn btn-default skip"
              id="continuebutton-${sectionElement.id}"
              data-section-id="${sectionElement.id}"
              ${sectionButtonI18n}
            >${sectionButtonText}</button>`
          )
          continueButton.data('n_clicks', 0)
          continueButton.on('click', handleSkipClick)
          const actions = $('<div class="exerciseActions"></div>')
          actions.append(continueButton)
          $(sectionElement).append(actions)
        }

        $(sectionElement).on('shown', function () {
          // A 'shown' event can be triggered even when this section isn't
          // actually visible. This can happen when the parent topic isn't
          // visible. So we have to check that this section actually is
          // visible.
          updateSectionVisibility(sectionElement)
        })

        $(sectionElement).on('hidden', function () {
          updateSectionVisibility(sectionElement)
        })

        const section = {}
        section.exercises = []
        const exercisesDOM = $(sectionElement).children('.tutorial-exercise')
        exercisesDOM.each(function (exerciseIndex, exerciseElement) {
          const exercise = {}
          exercise.dataLabel = $(exerciseElement).attr('data-label')
          exercise.completed = false
          exercise.jqElement = exerciseElement
          section.exercises.push(exercise)
        })

        let allowSkipAttr = $(sectionElement).attr('data-allow-skip')
        let sectionAllowSkip = docAllowSkip
        if (
          typeof allowSkipAttr !== typeof undefined &&
          allowSkipAttr !== false
        ) {
          sectionAllowSkip = allowSkipAttr = 'true' || allowSkipAttr === 'TRUE'
        }

        section.id = sectionElement.id
        section.completed = false
        section.allowSkip = sectionAllowSkip
        section.skipped = false
        section.jqElement = sectionElement
        topic.sections.push(section)
      })

      topics.push(topic)
    })

    // const topicsFooter = $('<footer class="topicsFooter"></footer>')

    if (enableResetBtn) {
      const resetButton = $(
        '<li class="resetButton"><a href="#" data-i18n="text.startover">Start Over</a></li>'
      )
      resetButton.on('click', function () {
        const areyousure = i18next.t([
          'text.areyousure',
          'Are you sure you want to start over? (all exercise progress will be reset)'
        ])

        bootbox.setLocale(i18nextLang())
        bootbox.confirm(areyousure, function (result) {
          result && tutorial.startOver()
        })
      })

      $('#doc-metadata-additional ul').prepend(resetButton)
    }

    // topicsFooter.append(resetButton)
    // topicsList.append(topicsFooter)

    return topicsList
  }

  // topicMenuInputBinding
  // ------------------------------------------------------------------
  // This keeps tracks of what topic is selected
  const topicMenuInputBinding = new Shiny.InputBinding()
  $.extend(topicMenuInputBinding, {
    find: function (scope) {
      return $(scope).find('.topicsList')
    },
    getValue: function (el) {
      if (currentTopicIndex === -1) return null
      return topics[currentTopicIndex].id
    },
    setValue: function (el, value) {
      for (let i = 0; i < topics.length; i++) {
        if (topics[i].id === value) {
          setCurrentTopic(i, false)
          break
        }
      }
    },
    subscribe: function (el, callback) {
      setCurrentTopicNotifiers.add(el.id, callback)
    },
    unsubscribe: function (el) {
      setCurrentTopicNotifiers.remove(el.id)
    }
  })
  Shiny.inputBindings.register(
    topicMenuInputBinding,
    'learnr.topicMenuInputBinding'
  )

  // continueButtonInputBinding
  // ------------------------------------------------------------------
  // This keeps tracks of what topic is selected
  const continueButtonInputBinding = new Shiny.InputBinding()
  $.extend(continueButtonInputBinding, {
    find: function (scope) {
      return $(scope).find('.exerciseActions > button.skip')
    },
    getId: function (el) {
      return 'continuebutton-' + el.getAttribute('data-section-id')
    },
    getValue: function (el) {
      return $(el).data('n_clicks')
    },
    setValue: function (el, value) {
      const valueCurrent = $(el).data('n_clicks')
      if (value > valueCurrent) {
        $(el).trigger('click')
      }

      // Just in case the click event didn't increment n_clicks to be the same
      // as the `value`, set `n_clicks` to be the same.
      $(el).data('n_clicks', value)
    },
    subscribe: function (el, callBack) {
      $(el).on('click.continueButtonInputBinding', function (event) {
        callBack(false)
      })
    },
    unsubscribe: function (el) {
      $(el).off('.continueButtonInputBinding')
    }
  })
  Shiny.inputBindings.register(
    continueButtonInputBinding,
    'learnr.continueButtonInputBinding'
  )

  // transform the DOM here
  function transformDOM () {
    titleText = $('title')[0].innerText

    const progAttr = $('meta[name=progressive]').attr('content')
    docProgressiveReveal = progAttr === 'true' || progAttr === 'TRUE'
    const allowSkipAttr = $('meta[name=allow-skip]').attr('content')
    docAllowSkip = allowSkipAttr === 'true' || allowSkipAttr === 'TRUE'

    const tutorialTitle = $(`<h1 class="tutorialTitle">${titleText}</h1>`)
    tutorialTitle.on('click', showFloatingTopics)
    $('.topics').prepend(tutorialTitle)

    $('.bandContent.topicsListContainer').append(buildTopicsList())

    // initialize visibility of all topics' elements
    for (let t = 0; t < topics.length; t++) {
      updateVisibilityOfTopicElements(t)
    }

    removeFootnoteLinks()

    function handleResize () {
      $('.topicsList').css('max-height', window.innerHeight)
    }

    handleResize()
    window.addEventListener('resize', handleResize)
  }

  /* Footnote links don't work in learnr, so we remove the anchor tags */
  function removeFootnoteLinks () {
    $('.footnote-ref').replaceWith(function () {
      const el = $('<span>')
      el.addClass($(this).class)
      el.append($(this).html())
      return el
    })
    $('.footnote-back').remove()
  }

  function isBS3 () {
    // from https://github.com/rstudio/shiny/blob/474f14/srcts/src/utils/index.ts#L373-L376
    return !window.bootstrap
  }

  function preTransformDOMMigrateFromBS3 () {
    if (isBS3()) return

    document.querySelectorAll('.btn-xs').forEach(el => {
      el.classList.remove('btn-xs')
      el.classList.add('btn-sm')
    })

    document.querySelectorAll('.sr-only').forEach(el => {
      // .visually-hidden and .visually-hidden-focusable are mutually exclusive
      if (el.classList.contains('visually-hidden-focusable')) return
      el.classList.add('visually-hidden')
    })

    const panelMigration = {
      panel: 'card',
      'panel-default': '',
      'panel-heading': 'card-header',
      'panel-title': 'card-title',
      'panel-body': 'card-body',
      'panel-footer': 'card-footer'
    }

    const tutorialMigratePanels = document.querySelectorAll('.tutorial-exercise-input, .tutorial-question-container')

    if (tutorialMigratePanels.length === 0) {
      // no panels to migrate, all done with migrations!
      return
    }

    tutorialMigratePanels.forEach(elPanel => {
      Object.keys(panelMigration).forEach(classOrig => {
        const els = [elPanel, ...elPanel.querySelectorAll(`.${classOrig}`)]
        if (!els.length) return
        const classNew = panelMigration[classOrig]
        els.forEach(el => {
          if (!el.classList.contains(classOrig)) return
          el.classList.remove(classOrig)
          if (classNew !== '') {
            el.classList.add(classNew)
          }
        })
      })
    })
  }

  // support bookmarking of topics
  function handleLocationHash () {
    function findTopicIndexFromHash () {
      const hash = window.decodeURIComponent(window.location.hash)
      let topicIndex = 0
      if (hash.length > 0) {
        $.each(topics, function (ti, t) {
          if ('#' + t.id === hash) {
            topicIndex = ti
            return false
          }
        })
      }
      return topicIndex
    }

    // select topic from hash on the url
    setCurrentTopic(findTopicIndexFromHash())

    addRemainingSummaries(currentTopicIndex - 1)

    // navigate to a topic when the history changes
    window.addEventListener('popstate', function (e) {
      setCurrentTopic(findTopicIndexFromHash())
    })
  }

  // update UI after a section gets completed
  // it might be an exercise or it might be an entire topic
  function sectionCompleted (section) {
    const jqSection = $(section)

    const topicCompleted = jqSection.hasClass('level2')

    let topicId
    if (topicCompleted) {
      topicId = jqSection.attr('id')
    } else {
      topicId = $(jqSection.parents('.section.level2')).attr('id')
    }

    // find the topic in our topics array
    let topicIndex = -1
    $.each(topics, function (ti, t) {
      if (t.id === topicId) {
        topicIndex = ti
        return false
      }
    })
    if (topicIndex === -1) {
      console.log('topic "' + topicId + '" not found')
      return
    }

    const topic = topics[topicIndex]

    if (topicCompleted) {
      // topic completed
      topic.topicCompleted = true
      updateTopicProgressBar(topicIndex)
    } else {
      // exercise completed
      let sectionIndex = -1
      const sectionId = jqSection.attr('id')
      $.each(topic.sections, function (si, s) {
        if (s.id === sectionId) {
          sectionIndex = si
          return false
        }
      })
      if (sectionIndex === -1) {
        console.log('completed section"' + sectionId + '"not found')
        return
      }

      // update the UI if the section isn't already marked completed
      const section = topic.sections[sectionIndex]
      if (!section.completed) {
        topic.sectionsCompleted++

        updateTopicProgressBar(topicIndex)

        // update the exercise
        $(section.jqElement).addClass('done')
        section.completed = true

        // update visibility of topic's exercises and actions
        updateVisibilityOfTopicElements(topicIndex)
      }
    }
  }

  // Keep track of which sections are currently visible. When this changes
  const visibleSections = []
  function resetSectionVisibilityList () {
    visibleSections.splice(0, visibleSections.length)
    sendVisibleSections()
  }

  function updateSectionVisibility (sectionElement) {
    const idx = visibleSections.indexOf(sectionElement.id)

    if ($(sectionElement).is(':visible')) {
      if (idx === -1) {
        visibleSections.push(sectionElement.id)
        sendVisibleSections()
      }
    } else {
      if (idx !== -1) {
        visibleSections.splice(idx, 1)
        sendVisibleSections()
      }
    }
  }

  function sendVisibleSections () {
    // This function may be called several times in a tick, which results in
    // many calls to Shiny.setInputValue(). That shouldn't be a problem since
    // those calls are deduped; only the last value gets sent to the server.
    if (Shiny && Shiny.setInputValue) {
      Shiny.setInputValue('tutorial-visible-sections', visibleSections)
    } else {
      $(document).on('shiny:sessioninitialized', function () {
        Shiny.setInputValue('tutorial-visible-sections', visibleSections)
      })
    }
  }

  // update the UI after a section or topic (with 0 sections) gets skipped
  function sectionSkipped (exerciseElement) {
    let sectionSkippedId
    if (exerciseElement.length) {
      sectionSkippedId = exerciseElement[0].id
    } else {
      // error
      console.log(
        'section ' + $(exerciseElement).selector.split('"')[1] + ' not found'
      )
      return
    }

    let topicIndex = -1
    $.each(topics, function (ti, topic) {
      if (sectionSkippedId === topic.id) {
        topicIndex = ti
        topic.topicCompleted = true
        return false
      }
      $.each(topic.sections, function (si, section) {
        if (sectionSkippedId === section.id) {
          topicIndex = ti
          section.skipped = true
          topic.sectionsSkipped++
          return false
        }
      })
      return topicIndex === -1
    })

    // update the progress bar
    updateTopicProgressBar(topicIndex)
    // update visibility of topic's exercises and actions
    updateVisibilityOfTopicElements(topicIndex)
  }

  function hashCode (str) {
    let hash = 0; let i = 0; const len = str.length
    while (i < len) {
      hash = ((hash << 5) - hash + str.charCodeAt(i++)) << 0
    }
    return hash + 2147483647 + 1
  }

  function addSummary (topicIndex, summaryIdx) {
    if (!enableSummaryPanel) return

    const maincol = $('.parallellayout.col.main')
    const sidebar = $('.parallellayout.col.side')

    if (!sidebar.is(':visible')) {
      let opts = { dontShowAgain: true }
      if (config.language === 'de') {
        const transl = {
          nextLabel: 'Weiter',
          prevLabel: 'Zurück',
          doneLabel: 'Fertig',
          stepNumbersOfLabel: 'von',
          dontShowAgainLabel: 'Nicht wieder anzeigen'
        }
        opts = { ...opts, ...transl }
      }

      maincol.css('flexBasis', '100%')
      sidebar.css('flexBasis', '0%')
      sidebar.show()
      sidebar.animate({
        flexBasis: '30%'
      }, {
        duration: 1000,
        step: function (now, fx) {
          maincol.css('flexBasis', (100 - now) + '%')
        },
        complete: function () {
          if (tracking_config.summary) {
            // send tracking event
            postEvent(sess, tracking_session_id, sessdata.user_code, 'summary_shown')
          }
          // after the animation is complete, we need to re-render some elements to prevent cluttering of
          // math and plots
          // re-render all math
          MathJax.Hub.Queue(['Rerender', MathJax.Hub])
          // re-render all plots
          $('.shiny-plot-output').each(() => Shiny.renderContent(this.id))
          // show intro js box
          introJs().setOptions(opts).start()
        }
      })
    }

    const topicSummaryKey = `${topicIndex}.${summaryIdx}`
    const summariesContainer = $('#summarytext')
    let topicID = null

    if (!addedSummaries.has(topicSummaryKey)) {
      const embeddedSummariesContainer = $(`.section.level2:eq(${topicIndex})  .summary:eq(${summaryIdx})`)
      const nearestMainContentElem = embeddedSummariesContainer.prevAll('.mainContentElem').first() || embeddedSummariesContainer.nextAll('.mainContentElem').first()

      topicID = embeddedSummariesContainer.prop('id')
      const summaryElems = embeddedSummariesContainer.children().detach()

      let sectionContainer = null
      let sectionContainerCreated = false
      for (let i = 0; i < summaryElems.length; i++) {
        const supElem = summaryElems[i]
        const replacemode = $(supElem).hasClass('replace') || embeddedSummariesContainer.hasClass('replace')

        const subElems = supElem.tagName === 'DIV' ? $(supElem).children() : [supElem]

        for (let j = 0; j < subElems.length; j++) {
          const e = subElems[j]
          const $e = $(e)

          if (e.tagName === 'H4') {
            if (sectionContainer !== null) {
              sectionContainer.css('opacity', '0%').animate(
                { opacity: '100%' },
                { duration: 1000 }
              )
              summariesContainer.append(sectionContainer)
            }

            const cls = 'summaryContainer_' + hashCode($e.text())
            $e.on('click', function () {
              updateLocation(topicIndex, nearestMainContentElem.length ? nearestMainContentElem.prop('id') : undefined)
            })
            sectionContainer = summariesContainer.find('.' + cls)
            if (sectionContainer.length === 0) {
              sectionContainer = $(`<div class="${cls}"></div>`)
              sectionContainer.append($e)
              sectionContainerCreated = true
            }
          } else if (sectionContainer !== null) {
            if (replacemode) {
              sectionContainer.find(':not(h4)').remove()
            }
            sectionContainer.append($e)
          } else {
            console.error('invalid summary definition (no summary section provided before)')
          }

          if (sectionContainer !== null && i >= summaryElems.length - 1) {
            // display the summary panel with an animation
            sectionContainer.css('opacity', '0%').animate(
              { opacity: '100%' },
              { duration: 1000 }
            )

            if (sectionContainerCreated) {
              summariesContainer.append(sectionContainer)
              sectionContainerCreated = false
            }
          }
        }
      }

      if (tracking_config.summary) {
        // send tracking event
        postEvent(sess, tracking_session_id, sessdata.user_code, 'summary_topic_added', {
          key: topicSummaryKey,
          id: topicID
        })
      }

      const summariesScrollable = summariesContainer.parent()
      summariesScrollable.animate({ scrollTop: summariesScrollable.prop('scrollHeight') }, 1000)
      addedSummaries.add(topicSummaryKey)
    }
  }

  function addRemainingSummaries (upToTopicIndex) {
    if (!enableSummaryPanel) return

    for (let t = 0; t <= upToTopicIndex; t++) {
      const summaries = $(`.section.level2:eq(${t})`).find('.summary')

      for (let s = 0; s < summaries.length; s++) {
        if (!addedSummaries.has(`${t}.${s}`)) {
          addSummary(t, s)
        }
      }
    }
  }

  function updateContentElemHeight (containerH) {
    const h = Math.floor(containerH - $('.topicsContainer').height())
    $('.parallellayout.row').height(h - 24)
  }

  // add listener for scrolling through main column -> will trigger adding summaries for this topic
  if (enableSummaryPanel) {
    $('.parallellayout.col.main').scroll(function () {
      const summaries = $(`.section.level2:eq(${currentTopicIndex})`).find('.summary')
      const pastScroll = $('.bandContent.topicsListContainer').height()

      summaries.each(function (summaryIdx, summaryElem) {
        // console.log(summaryIdx, summaryElem.getBoundingClientRect().bottom, pastScroll)
        if (summaryElem.getBoundingClientRect().bottom < pastScroll) {
          addSummary(currentTopicIndex, summaryIdx)
        }
      })

      const maxScroll = this.scrollHeight - this.clientHeight
      if (this.scrollTop >= maxScroll - 10) {
        // scrolled to end; add all summaries that haven't been added, yet
        addRemainingSummaries(currentTopicIndex)
      }
    })

    $(window).on('hashchange', function () { // monitor external location hash change
      addRemainingSummaries(currentTopicIndex - 1)
    })
  }

  $(window).on('resize', function () { // monitor window resize events
    updateContentElemHeight($(this).height())
  })

  preTransformDOMMigrateFromBS3()
  transformDOM()
  handleLocationHash()
  updateContentElemHeight($(window).height())

  // enable all "run" buttons (somehow, learnr disables them by default and doesn't re-enable them)
  setTimeout(function () {
    $('.btn-tutorial-run').removeClass('disabled')
  }, 5000)

  // initialize components within tutorial.onInit event
  tutorial.onInit(function () {
    // handle progress events
    tutorial.onProgress(function (progressEvent) {
      if (progressEvent.event === 'section_completed') {
        sectionCompleted(progressEvent.element)
      } else if (progressEvent.event === 'section_skipped') {
        sectionSkipped(progressEvent.element)
      }
    })
  })
})
