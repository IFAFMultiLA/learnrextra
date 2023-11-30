// Session replay functions for adaptivelearnr javascript code.

/**
 * Global variables and constants
 */

let replay_chunk_i = 0;  // current replay chunk index
let replay_n_chunks = null;  // index of the last replay chunk
let replay_chunks = {};  // object that maps replay chunk indices to chunk data for all chunks
                         // that were not completely played, yet


/**
 * Callback function when replay of a chunk has ended.
 */
function replayChunkEnd() {
    // time elapsed in millisec. for all chunks that were played so far
    const time_elapsed = replay_chunks[replay_chunk_i].timeElapsed * 1000;
    // remove chunk data that was just played
    delete replay_chunks[replay_chunk_i];

    if (replay_chunk_i >= replay_n_chunks - 1) {
        console.log("no more replay chunks to play");
        replayStop();
        return;
    }

    if (!((replay_chunk_i + 1) in replay_chunks)) {
        // no replay data (yet) for this chunk – try again in 500ms
        console.log("no replay data (yet) for chunk index ", replay_chunk_i + 1);
        window.setTimeout(replayChunkEnd, 500);
    } else {
            // get chunk data for the current replay chunk index
        replay_chunk_i++;

        console.log("continue playing with chunk index ", replay_chunk_i);
        let replaydata = replay_chunks[replay_chunk_i];
        const frames = Array.from(replaydata.frames, (f) => f.slice(0, -1).concat(f.slice(-1) - time_elapsed));

        // set the new chunk data and continue playing
        //window.resizeTo(replaydata.window.width, replaydata.window.height);
        mus.pause();
        mus.setFrames(frames);
        mus.setWindowSize(replaydata.window.width, replaydata.window.height);
        mus.play(replayChunkEnd);
    }

    if (replay_chunk_i < replay_n_chunks - 1) {
        // request next chunk
        console.log("requesting replay chunk data with index ", replay_chunk_i + 1);
        messageToParentWindow("pulldata", {"i": replay_chunk_i + 1});
    } else {
        console.log("no more replay chunks to request");
    }
}


/**
 * Playback for session replay has stopped – reset states.
 */
function replayStop() {
    mus.stop();
    mus.release();
    replay_chunks = {};
    replay_chunk_i = 0;
    replay_start_on_first_chunk = false;

    // inform the parent window
    messageToParentWindow("replay_stopped");
}


/**
 * Event handler for receiving events from the parent frame in session replay mode.
 */
function replayMessageReceived(event) {
    console.log("message from parent frame:", event);

    if (!event.isTrusted || event.origin !== apiserver_url.origin) return

    if (event.data.msgtype === "app_config") {
        prepareSession(sess, event.data.data);
    } else if (event.data.msgtype === "replaydata") {
        let replay_i = event.data.data.i;
        let replaydata = event.data.data.replaydata;

        replay_chunks[replay_i] = replaydata;

        if (replay_i === 0) {
            console.log("received first replay chunk");
            replay_n_chunks = event.data.data.n_chunks;
            console.log("number of replay chunks is ", replay_n_chunks);
            replay_chunk_i = 0;

            //window.resizeTo(replaydata.window.width, replaydata.window.height);
            mus.setFrames(replaydata.frames);
            mus.setWindowSize(replaydata.window.width, replaydata.window.height);

            if (replay_n_chunks > 1) {
                console.log("requesting replay chunk data with index ", 1);
                messageToParentWindow("pulldata", {"i": 1});
            }
        }
    } else if (event.data.msgtype === "replay_ctrl_play") {
        mus.play(replayChunkEnd);
    } else if (event.data.msgtype === "replay_ctrl_pause") {
        mus.pause(replayChunkEnd);
    } else if (event.data.msgtype === "replay_ctrl_stop") {
        replayStop();
    } else if (event.data.msgtype === "set_replay_speed") {
        const speed = event.data.data;

        switch (speed) {
            case 'realtime':
                mus.setTimePoint(true);
                break;
            case 'slow':
                mus.setTimePoint(false);
                mus.setPlaybackSpeed(mus.speed.SLOW);
                break;
            case 'normal':
                mus.setTimePoint(false);
                mus.setPlaybackSpeed(mus.speed.NORMAL);
                break;
            case 'fast':
                mus.setTimePoint(false);
                mus.setPlaybackSpeed(mus.speed.FAST);
                break;
            default:
                console.warn("unknown playback speed setting: ", speed);
        }

        if (mus.isPlaying()) {
            // mus.js requires this to actually update the timeouts and hence the speed:
            mus.pause();
            mus.play();
        }
    } else {
        console.error("event message type not understood:", event.data.msgtype);
    }
}
