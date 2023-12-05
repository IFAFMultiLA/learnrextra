/* global $, define, XPathEvaluator, XPathResult */
/*!
 * Mus.js v1.1.0 adapted by Markus Konrad <markus.konrad@htw-berlin.de>
 *
 * Original code:
 * (c) 2018 Mauricio Giordano <giordano@inevent.us> - InEvent
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined'
    ? module.exports = factory()
    : typeof define === 'function' && define.amd
      ? define(factory)
      : (global.Mus = factory())
}(this, function () {
  'use strict'

  // Mus default cursor icon based on OSx default cursor
  const cursorIcon = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiCSB2aWV3Qm94PSIwIDAgMjggMjgiIGVuYWJsZS1iYWNrZ3JvdW5kPSJuZXcgMCAwIDI4IDI4IiB4bWw6c3BhY2U9InByZXNlcnZlIj48cG9seWdvbiBmaWxsPSIjRkZGRkZGIiBwb2ludHM9IjguMiwyMC45IDguMiw0LjkgMTkuOCwxNi41IDEzLDE2LjUgMTIuNiwxNi42ICIvPjxwb2x5Z29uIGZpbGw9IiNGRkZGRkYiIHBvaW50cz0iMTcuMywyMS42IDEzLjcsMjMuMSA5LDEyIDEyLjcsMTAuNSAiLz48cmVjdCB4PSIxMi41IiB5PSIxMy42IiB0cmFuc2Zvcm09Im1hdHJpeCgwLjkyMjEgLTAuMzg3MSAwLjM4NzEgMC45MjIxIC01Ljc2MDUgNi41OTA5KSIgd2lkdGg9IjIiIGhlaWdodD0iOCIvPjxwb2x5Z29uIHBvaW50cz0iOS4yLDcuMyA5LjIsMTguNSAxMi4yLDE1LjYgMTIuNiwxNS41IDE3LjQsMTUuNSAiLz48L3N2Zz4='

  /**
   * Mus constructor that defines initial variables and
   * sets browser width and height.
   * @knownbug: if user decides to change browser window size on-the-go
   *        it may cause bugs during playback
   */
  function Mus () {
    if (this === undefined) {
      console.error('Have you initialized Mus with "new" statement? (i.e. var mus = new Mus())')
      return
    }
    this.frames = []
    this.timeouts = []
    this.pos = 0
    this.currPos = 0
    this.startedAt = 0
    this.startedAtISODate = null
    this.finishedAt = 0
    this.timePoint = false
    this.recordInputs = true
    this.recordCurrentElem = false
    this.curElemXPath = null
    this.curElemCSSPath = null
    this.recording = false
    this.clickHighlightTimeout = 5000
    this.playing = false
    this.playbackSpeed = this.speed.NORMAL
    this.observer = ''
    this.curWindowResizeEventListener = null
    this.window = {
      width: window.outerWidth,
      height: window.outerHeight
    }

    // Stores initial listeners
    this.onmousemove = window.onmousemove
    this.onmousedown = window.onmousedown
    this.onscroll = window.onscroll
    this.inputWithUserKeyEvent = () => {
      document.querySelectorAll('textarea, input[type=text], input[type=email], input[type=number], input[type=tel], input[type=search], input[type=url], input[type=search], input[type=week], input[type=month], input[type=datetime-local]').forEach(element => {
        element.onkeydown = null
      })
    }
    this.inputWithOnchangeEvent = () => {
      document.querySelectorAll('select, input[type=checkbox], input[type=radio], input[type=color], input[type=date], input[type=file], input[type=number], input[type=range], input[type=time]').forEach(element => {
        element.onchange = null
      })
    }
  };

  /**
   * Here goes all Mus magic
   */
  Mus.prototype = {

    /** Mus Listeners **/

    /**
     * Listener intended to be used with window 'resize' event
     * @param callback function a callback fnc
     * @return function the window resize event listener
     */
    windowResizeListener: function (callback) {
      return function (e) {
        if (callback) {
          const record = ['w', window.innerWidth, window.innerHeight]
          callback(record)
        }
      }
    },

    /**
     * Listener intended to be used with onmousemove
     * @param callback function a callback fnc
     * @return function the mouse move listener
     */
    moveListener: function (callback) {
      const self = this
      return function (e) {
        if (callback) {
          const record = ['m', e.clientX, e.clientY]
          if (self.recordCurrentElem) {
            const xpath = self.getXpathFromElement(e.target)
            record.push(self.curElemXPath === xpath ? null : xpath)
            const csspath = self.getCSSPath(e.target)
            record.push(self.curElemCSSPath === csspath ? null : csspath)
            self.curElemXPath = xpath
            self.curElemCSSPath = csspath
          }
          callback(record)
        }
      }
    },

    /**
     * Listener intended to be used with onmousedown
     * @param callback function a callback fnc
     * @return function the mouse click listener
     */
    clickListener: function (callback) {
      const self = this
      return function (e) {
        if (callback) {
          const record = ['c', e.clientX, e.clientY]
          if (self.recordCurrentElem) {
            record.push(self.getXpathFromElement(e.target))
            record.push(self.getCSSPath(e.target))
          }
          callback(record)
        }
      }
    },

    /**
     * Listener intended to be used with onscroll
     * @param callbackFn function a callback fnc
     * @return function the window scroll listener
     */
    scrollListener: function (callbackFn) {
      return function (e) {
        if (callbackFn) callbackFn(['s', document.scrollingElement.scrollLeft, document.scrollingElement.scrollTop])
      }
    },

    /**
     * Listener intended to be used with onKeyDown
     * @param callbackFn function a callback fnc
     * @return function the input with user key listener
     */

    inputWithUserKeyListener: function (callbackFn) {
      const self = this
      return function (e) {
        if (callbackFn) callbackFn(['i', self.getXpathFromElement(e.target), self.getCSSPath(e.target), e.target.value])
      }
    },

    /**
     * Listener intended to be used with onChange
     * @param callbackFn function a callback fnc
     * @return function the input with onChange listener
     */

    inputWithOnchangeListener: function (callbackFn) {
      const self = this
      return function (e) {
        if (callbackFn) callbackFn(['o', self.getXpathFromElement(e.target), self.getCSSPath(e.target), e.target.value])
      }
    },

    /**
     * Listener intended to be used with mutation observer (remove or add a class name)
     * @param callback function a callback fnc
     * @return function the mutation observer
     */

    mutationObserver: function (callback) {
      return function (mutations) {
        if (callback) callback(mutations)
      }
    },

    /** Mus recording tools **/

    /**
     * Starts screen recording
     */
    record: function (onFrame) {
      if (this.recording) return

      const self = this
      if (self.startedAt === 0) {
        const now = new Date()
        self.startedAt = now.getTime() / 1000
        self.startedAtISODate = now.toISOString()
      }

      // Sets initial scroll position of the window
      if (self.timePoint) {
        self.frames.push(['s', document.scrollingElement.scrollLeft, document.scrollingElement.scrollTop, 0])
      } else {
        self.frames.push(['s', document.scrollingElement.scrollLeft, document.scrollingElement.scrollTop])
      }

      // Sets initial value of inputs
      if (self.recordInputs) {
        document.querySelectorAll('textarea, input[type=text], input[type=email], input[type=number], input[type=tel], input[type=search], input[type=url], input[type=search], input[type=week], input[type=month], input[type=datetime-local]').forEach(element => {
          if (self.timePoint) {
            self.frames.push(['i', self.getXpathFromElement(element), self.getCSSPath(element), element.value, 0])
          } else {
            self.frames.push(['i', self.getXpathFromElement(element), self.getCSSPath(element), element.value])
          }
        })
        document.querySelectorAll('select, input[type=checkbox], input[type=radio], input[type=color], input[type=date], input[type=file], input[type=number], input[type=range], input[type=time]').forEach(element => {
          if (self.timePoint) {
            if (element.type === 'checkbox' || element.type === 'radio') {
              self.frames.push(['o', self.getXpathFromElement(element), self.getCSSPath(element), element.value, element.checked, 0])
            } else {
              self.frames.push(['o', self.getXpathFromElement(element), self.getCSSPath(element), element.value, 0])
            }
          } else {
            if (element.type === 'checkbox' || element.type === 'radio') {
              self.frames.push(['o', self.getXpathFromElement(element), self.getCSSPath(element), element.value, element.checked])
            } else {
              self.frames.push(['o', self.getXpathFromElement(element), self.getCSSPath(element), element.value])
            }
          }
        })
      }

      // SET INITIAL VALUES END HERE

      // Defines Mus listeners on window
      this.curWindowResizeEventListener = this.windowResizeListener(function (record) {
        self.frames.push(self.timePoint ? record.concat(new Date().getTime() - (self.startedAt * 1000)) : record)
        if (onFrame instanceof Function) onFrame()
      })
      window.addEventListener('resize', this.curWindowResizeEventListener, true)

      window.onmousemove = this.moveListener(function (pos) {
        self.frames.push(self.timePoint ? pos.concat(new Date().getTime() - (self.startedAt * 1000)) : pos)
        if (onFrame instanceof Function) onFrame()
      })
      window.onmousedown = this.clickListener(function (click) {
        self.frames.push(self.timePoint ? click.concat(new Date().getTime() - (self.startedAt * 1000)) : click)
        if (onFrame instanceof Function) onFrame()
      })
      window.onscroll = this.scrollListener(function (scroll) {
        self.frames.push(self.timePoint ? scroll.concat(new Date().getTime() - (self.startedAt * 1000)) : scroll)
        if (onFrame instanceof Function) onFrame()
      })

      if (self.recordInputs) {
        document.querySelectorAll('textarea, input[type=text], input[type=email], input[type=number], input[type=tel], input[type=search], input[type=url], input[type=search], input[type=week], input[type=month], input[type=datetime-local]').forEach(element => {
          element.oninput = this.inputWithUserKeyListener(function (input) {
            self.frames.push(self.timePoint ? input.concat(new Date().getTime() - (self.startedAt * 1000)) : input)
            if (onFrame instanceof Function) onFrame()
          })
        })

        document.querySelectorAll('select, input[type=checkbox], input[type=radio], input[type=color], input[type=date], input[type=file], input[type=number], input[type=range], input[type=time]').forEach(element => {
          element.onchange = this.inputWithOnchangeListener(function (inputonchange) {
            const element = self.getElementByXpath(inputonchange[1])
            if (element.type === 'checkbox' || element.type === 'radio') {
              inputonchange = inputonchange.concat(element.checked)
              self.frames.push(self.timePoint ? inputonchange.concat(new Date().getTime() - (self.startedAt * 1000)) : inputonchange)
            } else {
              self.frames.push(self.timePoint ? inputonchange.concat(new Date().getTime() - (self.startedAt * 1000)) : inputonchange)
            }

            if (onFrame instanceof Function) onFrame()
          })
        })

        // Define mutation observer here
        const targetNode = document.querySelector('body')
        const config = { attributes: true, attributeOldValue: true, subtree: true }

        const MutationObserver = window.MutationObserver || window.WebKitMutationObserver
        this.observer = new MutationObserver(this.mutationObserver(function (mutations) {
          for (const mutation of mutations) {
            if (mutation.type === 'attributes') {
              let mutationFrame = []
              if (mutation.target.hasAttribute(mutation.attributeName)) {
                mutationFrame = ['a', self.getXpathFromElement(mutation.target), self.getCSSPath(mutation.target), mutation.attributeName, mutation.target.getAttribute(mutation.attributeName), mutation.oldValue, 'M']
              } else {
                mutationFrame = ['a', self.getXpathFromElement(mutation.target), self.getCSSPath(mutation.target), mutation.attributeName, mutation.oldValue, 'D']
              }

              self.frames.push(self.timePoint ? mutationFrame.concat(new Date().getTime() - (self.startedAt * 1000)) : mutationFrame)
              if (onFrame instanceof Function) onFrame()
            }
          }
        }))
        this.observer.observe(targetNode, config)
      }

      // Sets our recording flag
      self.recording = true
    },

    /**
     * Stops screen recording
     */
    stop: function () {
      this.finishedAt = new Date().getTime() / 1000
      window.removeEventListener('resize', this.curWindowResizeEventListener)
      this.curWindowResizeEventListener = null
      window.onmousemove = this.onmousemove
      window.onmousedown = this.onmousedown
      window.onscroll = this.onscroll
      this.inputWithUserKeyEvent()
      this.inputWithOnchangeEvent()
      if (this.observer !== '') this.observer.disconnect()
      // Sets our recording flag
      this.timeouts = []
      this.recording = false
      this.playing = false
      this.pos = 0
    },

    /**
     * Pauses current execution
     */
    pause: function () {
      if (this.playing) {
        this.pos = this.currPos
        this.playing = false
        this.clearTimeouts()
      }
    },

    /**
     * Runs a playback of a recording
     * @param function onfinish a callback function
     */
    play: function (onfinish) {
      if (this.playing) return

      const self = this
      self.createCursor()

      const node = document.getElementById('musCursor')
      let delay = ''
      let startDelay = 0
      const startPos = self.pos
      if (startPos > 0) { // subtract this delay in realtime playback as these frames were played before a pause
        startDelay = self.frames[startPos][self.frames[startPos].length - 1]
      }

      for (; self.pos < self.frames.length; self.pos++) {
        if (self.timePoint) {
          delay = self.frames[self.pos][self.frames[self.pos].length - 1] - startDelay
        } else {
          delay = (self.pos - startPos) * self.playbackSpeed
        }

        self.timeouts.push(setTimeout(function (pos) {
          // Plays specific timeout
          self.playFrame(self, self.frames[pos], node)
          self.currPos = pos

          if (pos === self.frames.length - 1) {
            node.style.backgroundColor = 'transparent'
            self.timeouts = []
            self.playing = false
            self.pos = 0
            if (onfinish) onfinish()
          }
        }, delay, self.pos))
      }
      ;

      this.playing = true
    },

    /**
     * Releases Mus instance
     */
    release: function () {
      this.frames = []
      this.startedAt = 0
      this.startedAtISODate = null
      this.finishedAt = 0
      this.stop()
      this.destroyCursor()
      this.destroyClickSnapshot()
    },

    /** Mus internal functions **/

    /**
     * Play a specific frame from playback
     */
    playFrame: function (self, frame, node) {
      try {
        if (frame[0] === 'm') {
          // let xoffset = 100;
          const left = document.scrollingElement.scrollLeft
          const top = document.scrollingElement.scrollTop
          // node.style.left = (left + self.getXCoordinate(frame[1])) + "px";
          // node.style.top = (top + self.getYCoordinate(frame[2])) + "px";
          node.style.left = (left + frame[1]) + 'px'
          node.style.top = (top + frame[2]) + 'px'
        } else if (frame[0] === 'c') {
          self.createClickSnapshot(frame[1], frame[2])
          const element = self.getElementByXpath(frame[3])
          element.click()
        } else if (frame[0] === 's') {
          window.scrollTo(frame[1], frame[2])
        } else if (frame[0] === 'S') { // content scoll
          const element = document.querySelector('div.parallellayout.col.main')
          element.scrollTo(frame[1], frame[2])
        } else if (frame[0] === 'i') {
          const element = self.getElementByXpath(frame[1])
          element.value = frame[3]
        } else if (frame[0] === 'o') {
          const element = self.getElementByXpath(frame[1])
          if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = frame[4]
          } else {
            element.value = frame[3]
          }
        } else if (frame[0] === 'a') {
          const element = self.getElementByXpath(frame[1])
          if (frame[6] === 'M') {
            element.setAttribute(frame[3], frame[4])
          } else if (frame[5] === 'D') {
            element.removeAttribute(frame[3])
          }
        }
      } catch (err) {
        // ignore
      }
    },

    /**
     * Clears all timeouts stored
     */
    clearTimeouts: function () {
      for (const i in this.timeouts) {
        clearTimeout(this.timeouts[i])
      }

      this.timeouts = []
    },

    /**
     * Calculates time elapsed during recording
     * @return integer time elapsed
     */
    timeElapsed: function () {
      return this.finishedAt - this.startedAt
    },

    /**
     * Creates Mus cursor if non-existent
     */
    createCursor: function () {
      if (!document.getElementById('musCursor')) {
        const node = document.createElement('div')
        node.id = 'musCursor'
        node.style.position = 'absolute'
        node.style.width = '32px'
        node.style.height = '32px'
        // node.style.top = "-100%";
        // node.style.left = "-100%";
        node.style.borderRadius = '32px'
        node.style.backgroundImage = 'url(' + cursorIcon + ')'
        document.body.appendChild(node)
      }
    },

    /**
     * Destroys Mus cursor
     */
    destroyCursor: function () {
      const cursor = document.getElementById('musCursor')
      if (cursor) cursor.remove()
    },

    /**
     * Creates Mus click snapshot
     */
    createClickSnapshot: function (x, y) {
      const left = document.scrollingElement.scrollLeft
      const top = document.scrollingElement.scrollTop
      const node = document.createElement('div')
      node.className = 'musClickSnapshot'
      node.style.position = 'absolute'
      node.style.width = '32px'
      node.style.height = '32px'
      node.style.top = (y + top) + 'px'
      node.style.left = (x + left) + 'px'
      node.style.borderRadius = '32px'
      node.style.backgroundColor = 'red'
      node.style.opacity = 0.2
      document.body.appendChild(node)
      window.setTimeout(function () {
        document.body.removeChild(node)
      }, this.clickHighlightTimeout)
    },

    /**
     * Destroys Mus click snapshot
     */
    destroyClickSnapshot: function () {
      const nodes = document.getElementsByClassName('musClickSnapshot')
      while (nodes.length > 0) {
        nodes[0].remove()
      }
    },

    /**
     * Calculates current X coordinate of mouse based on window dimensions provided
     * @param x integer the x position
     * @return integer calculated x position
     */
    getXCoordinate: function (x) {
      if (window.outerWidth > this.window.width) {
        return parseInt(this.window.width * x / window.outerWidth)
      }

      return parseInt(window.outerWidth * x / this.window.width)
    },

    /**
     * Calculates current Y coordinate of mouse based on window dimensions provided
     * @param y integer the y position
     * @return integer calculated y position
     */
    getYCoordinate: function (y) {
      if (window.outerHeight > this.window.height) {
        return parseInt(this.window.height * y / window.outerHeight)
      }

      return parseInt(window.outerHeight * y / this.window.height)
    },

    /** Public getters and setters **/

    /**
     * Get all generated Mus data
     * @return array generated Mus data
     */
    getData: function () {
      return {
        frames: this.frames,
        startedAtISODate: this.startedAtISODate,
        timeElapsed: this.timeElapsed(),
        window: {
          width: window.outerWidth,
          height: window.outerHeight
        }
      }
    },

    /**
     * Get point time recording flag
     * @return boolean point time flag
     */
    isTimePoint: function () {
      return this.timePoint
    },

    /**
     * Sets generated Mus data for playback
     * @param data array generated Mus data
     */
    setData: function (data) {
      if (data.frames) this.frames = data.frames
      if (data.window) this.window = data.window
    },

    /**
     * Sets recorded frames for playback
     * @param frames array the frames array
     */
    setFrames: function (frames) {
      this.frames = frames
    },

    /**
     * Sets custom window size for playback
     * @param width integer window width
     * @param height integer window height
     */
    setWindowSize: function (width, height) {
      this.window.width = width
      this.window.height = height
    },

    /**
     * Sets a playback speed based on Mus speed set
     * @param speed integer the playback speed
     */
    setPlaybackSpeed: function (speed) {
      this.playbackSpeed = speed
    },

    /**
     * Sets point time recording for accurate data
     * @param
     */
    setTimePoint: function (timePoint) {
      this.timePoint = timePoint
    },

    /**
     * Sets point time recording for accurate data
     * @param
     */
    setRecordInputs: function (recordInputs) {
      this.recordInputs = recordInputs
    },

    /**
     * Sets point time recording for accurate data
     * @param
     */
    setRecordCurrentElem: function (recordCurrentElem) {
      this.recordCurrentElem = recordCurrentElem
    },

    /**
     * Informs if Mus is currently recording
     * @return boolean is recording?
     */
    isRecording: function () {
      return this.recording
    },

    /**
     * Informs if Mus is currently playing
     * @return boolean is playing?
     */
    isPlaying: function () {
      return this.playing
    },

    /** Mus speed constants **/

    speed: {
      SLOW: 35,
      NORMAL: 15,
      FAST: 5
    },

    /**
     * Function to get CSS selector that uniquely identifies `el`.
     *
     * Taken from https://stackoverflow.com/a/57257763.
     */
    getCSSPath: function (el) {
      const renderedPathParts = []

      $(el).parents().addBack().each((i, el) => {
        const $el = $(el)
        let curElemPath = $el.prop('tagName').toLowerCase()

        if ($el.attr('id')) {
          curElemPath += '#' + $el.attr('id')
        }

        if ($el.attr('class')) {
          curElemPath += '.' + $el.attr('class').split(' ').join('.')
        }

        renderedPathParts.push(curElemPath)
      })

      return renderedPathParts.join(' ')
    },

    getXpathFromElement: function (elm) {
      let i, segs, sib
      for (segs = []; elm && elm.nodeType === 1; elm = elm.parentNode) {
        for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
          if (sib.localName === elm.localName) i++
        }
        ;
        segs.unshift(elm.localName.toLowerCase() + '[' + i + ']')
      }
      ;
      return segs.length ? '/' + segs.join('/') : null
    },

    getElementByXpath: function (path) {
      const evaluator = new XPathEvaluator()
      const result = evaluator.evaluate(path, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null)
      return result.singleNodeValue
    }

  }

  return Mus
}))
