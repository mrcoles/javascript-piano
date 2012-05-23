
(function() {

    //
    // Setup keys!
    //

    var notesOffset = 0;

    var blackKeys = {
        1: 1,
        3: 3,
        6: 1,
        8: 2,
        10: 3
    };
    $.each(blackKeys, function(k, v) {
        blackKeys[k] = ' black black'+v;;
    });

    function blackKeyClass(i) {
        return blackKeys[(i % 12) + (i < 0 ? 12 : 0)] || '';
    }

    var $keys = $('<div>', {'class': 'keys'}).appendTo('#piano');

    var buildingPiano = false;

    var isIos = navigator.userAgent.match(/(iPhone|iPad)/i);

    function buildPiano() {
        if (buildingPiano) return;
        buildingPiano = true;

        $keys.trigger('build-start.piano');
        $keys.empty().off('.play');

        function addKey(i) {
            var dataURI = isIos ? '' : Notes.getDataURI(i);

            // trick to deal with note getting hit multiple times before finishing...
            var sounds = [
                new Audio(dataURI),
                new Audio(dataURI),
                new Audio(dataURI)
            ];
            var curSound = 0;
            var pressedTimeout;
            dataURI = null;
            function play(evt) {
                // sound
                sounds[curSound].pause();
                try {
                    sounds[curSound].currentTime = 0.001; //HACK - was for mobile safari, but sort of doesn't matter...
                } catch (x) {
                    console.log(x);
                }
                sounds[curSound].play();
                curSound = ++curSound % sounds.length;

                var $k = $keys.find('[data-key='+i+']').addClass('pressed');

                //TODO - it'd be nice to have a single event for triggering and reading
                $keys.trigger('played-note.piano', [i, $k]);

                // visual feedback
                window.clearTimeout(pressedTimeout);
                pressedTimeout = window.setTimeout(function() {
                    $k.removeClass('pressed');
                }, 200);
            }
            $keys.on('note-'+i+'.play', play);
            var $key = $('<div>', {
                'class': 'key' + blackKeyClass(i),
                'data-key': i,
                mousedown: function(evt) { $keys.trigger('note-'+i+'.play'); }
            }).appendTo($keys);
        }

        // delayed for-loop to stop browser from crashing :'(
        // go slower on Chrome...
        var i = -12, max = 14, addDelay = /Chrome/i.test(navigator.userAgent) ? 100 : 50;
        (function go() {
            addKey(i + notesOffset);
            if (++i < max) {
                window.setTimeout(go, addDelay);
            } else {
                buildingPiano = false;
                $keys.trigger('build-done.piano');
            }
        })();
    }

    buildPiano();


    //
    // Setup synth controls
    //

    function camelToText(x) {
        x = x.replace(/([A-Z])/g, ' $1');
        return x.charAt(0).toUpperCase() + x.substring(1);
    }

    $.each(['volume', 'style'], function(i, setting) {
        var $opts = $('<div>', {
            'class': 'opts',
            html: '<p><strong>' + camelToText(setting) + ':</strong></p>'
        }).appendTo('#synth-settings');

        $.each(DataGenerator[setting], function(name, fn) {
            if (name != 'default') {
                $('<p>')
                    .append($('<a>', {
                        text: camelToText(name),
                        href: '#',
                        'class': fn === DataGenerator[setting].default ? 'selected' : '',
                        click: function(evt) {
                            evt.preventDefault();
                            DataGenerator[setting].default = fn;
                            buildPiano();
                            var $this = $(this);
                            $this.closest('.opts').find('.selected').removeClass('selected');
                            $this.addClass('selected');
                        }
                    }))
                    .appendTo($opts);
            }
        });
    });


    //
    // Setup keyboard interaction
    //

    var keyNotes = {
        /*a*/ 65: 0, // c
        /*w*/ 87: 1, // c#
        /*s*/ 83: 2, // d
        /*e*/ 69: 3, // d#
        /*d*/ 68: 4, // e
        /*f*/ 70: 5, // f
        /*t*/ 84: 6, // f#
        /*g*/ 71: 7, // g
        /*y*/ 89: 8, // g#
        /*h*/ 72: 9, // a
        /*u*/ 85: 10, // a#
        /*j*/ 74: 11, // b
        /*k*/ 75: 12, // c
        /*o*/ 79: 13, // c#
        /*l*/ 76: 14, // d
        /*p*/ 80: 15, // d#
        /*;*/ 186: 16, // e
        /*;*/ 59: 16, // e ... gotta figure out why it's sometimes 186 and sometimes 59
        /*,*/ 222: 17, // f
        /*]*/ 221: 18, // f#
        /*enter*/ 13: 19 // g
    };
    var notesShift = -12;
    var downKeys = {};

    function isModifierKey(evt) {
        return evt.metaKey || evt.shiftKey || evt.altKey;
    }

    $(window).keydown(function(evt) {
        var keyCode = evt.keyCode;
        // prevent repeating keys
        if (!downKeys[keyCode] && !isModifierKey(evt)) {
            downKeys[keyCode] = 1;
            var key = keyNotes[keyCode];
            if (typeof key != 'undefined') {
                $keys.trigger('note-'+(key+notesShift+notesOffset)+'.play');
                evt.preventDefault();
            } else if (evt.keyCode == 188) {
                notesShift = -12;
            } else if (evt.keyCode == 190) {
                notesShift = 0;
            } else if (keyCode == 37 || keyCode == 39) {
                notesOffset += (keyCode == 37 ? -1 : 1) * 12;
                buildPiano();
            }
        }
    }).keyup(function(evt) {
        delete downKeys[evt.keyCode];
    });


    //
    // Piano colors
    //

    var colors = 'f33 33f 3f3 ff3 f3f 3ff'.split(' '),
        curColor = 0;

    function colorHandler(evt) {
        if (evt.type === 'click' || (evt.keyCode == 67 && !isModifierKey(evt))) {
            if (++curColor >= colors.length) curColor = 0;
            document.getElementById('piano').style.backgroundColor = '#' + colors[curColor];
        }
    }

    $(window).keyup(colorHandler);
    $('.toggle-color').click(colorHandler);

    //
    // Help controls
    //

    var $help = $('.help');

    $(window).click(function(evt) {
        var $closestHelp = $(evt.target).closest('.help');
        if (!((evt.target.nodeName == 'A' || ~evt.target.className.search('hold')) && $closestHelp.length) &&
            ($closestHelp.length || $help.hasClass('show'))) {
            $help.toggleClass('show');
        }
    });

    var qTimeout, qCanToggle = true;;
    $(window).keypress(function(evt) {
        // trigger help when ? is pressed, but make sure it doesn't repeat crazy
        if (evt.which == 63 || evt.which == 48) {
            window.clearTimeout(qTimeout);
            qTimeout = window.setTimeout(function() {
                qCanToggle = true;
            }, 1000);
            if (qCanToggle) {
                qCanToggle = false;
                $help.toggleClass('show');
            }
        }
    });

    window.setTimeout(function() {
        $help.removeClass('show');
    }, 700);

    // prevent quick find...
    $(window).keydown(function(evt) {
        if (evt.target.nodeName != 'INPUT' && evt.target.nodeName != 'TEXTAREA') {
            if (evt.keyCode == 222) {
                evt.preventDefault();
                return false;
            }
        }
        return true;
    });

    //
    // Scroll nav
    //
    $.each([['#info', '#below'], ['#top', '#content']], function(i, x) {
        $(x[0]).click(function() {
            $('html,body').animate({
                scrollTop: $(x[1]).offset().top
            }, 1000);
        });
    });


    //
    // Demo
    //
    (function(undefined) {
        var chopsticks = (function() {
            var data = [
                {
                    'style': 'wave',
                    'volume': 'linearFade',
                    'notesOffset': 0
                }
            ];

            var main = [
                [6, -7, -5],
                [6, -7, -5],
                [6, -7, -5],
                [6, -7, -5],
                [6, -7, -5],
                [6, -7, -5],

                [6, -8, -5],
                [6, -8, -5],
                [6, -8, -5],
                [6, -8, -5],
                [6, -8, -5],
                [6, -8, -5],

                [6, -10, -1],
                [6, -10, -1],
                [6, -10, -1],
                [6, -10, -1],
                [6, -10, -1],
                [6, -10, -1],

                [6, -12, 0],
                [6, -12, 0],
                [6, -12, 0]
            ];

            data.push.apply(data, main);
            data.push(
                [6, -12, 0],
                [6, -10, -1],
                [6, -8, -3]
            );
            data.push.apply(data, main);
            data.push(
                [6, -12, 0],
                [6, -5],
                [6, -8],

                [6, -12],
                [12]
            );

            var main2 = [
                [6, 0, 4],
                [6, -1, 2],
                [6],

                [6, -3, 0],
                [6, -5, -1],
                [6],

                [6, -7, -3],
                [6, -8, -5],
                [6],

                [6, 0, 4],
                [6, 0, 4],
                [6],

                [6, -8, -5],
                [6, -10, -7],
                [6],

                [6, -1, 2],
                [6, -1, 2],
                [6]
            ];
            data.push.apply(data, main2);
            data.push(
                [6, -10, -7],
                [6, -12, -8],
                [6],

                    [6, -8, 0],
                [6, -8, 0],
                [6]
            );
            data.push.apply(data, main2);
            data.push(
                [6, -5, -1],
                [6, -8, 0],
                [6, -5],

                [6, -8],
                [6, -12],
                [6]
            );
            return data;
        })();


        var demoing = false, demoingTimeout;
        function demo(data) {
            var cfg = data[0];
            if (!buildingPiano && !demoing) {
                demoing = true;
                cfg.style && (DataGenerator.style.default = DataGenerator.style[cfg.style]);
                cfg.volume && (DataGenerator.volume.default = DataGenerator.volume[cfg.volume]);
                cfg.notesOffset !== undefined && (notesOffset = cfg.notesOffset);
                $keys.one('build-done.piano', function() {
                    //NOTE - jQuery.map flattens arrays
                    var i = 0, song = $.map(data, function(x, i) { return i == 0 ? null : [x]; });
                    (function play() {
                        if (!demoing) return;
                        if (i >= song.length) { i = 0; }
                        var part = song[i++];
                        if (part) {
                            var delay = part[0];
                            demoingTimeout = window.setTimeout(function() {
                                demoing && play();
                                for (var j=1, len=part.length; j<len; j++) {
                                    $keys.trigger('note-'+(part[j]+notesOffset)+'.play');
                                }
                            }, delay*50);
                        }
                    })();
                });
                buildPiano();
            }
        }

        function demoHandler(evt) {
            if (evt.type === 'click' || (evt.keyCode == 77 && !isModifierKey(evt))) {
                if (demoing) {
                    demoing = false;
                    window.clearTimeout(demoingTimeout);
                    $keys.unbind('build-done.piano');
                } else {
                    demo(chopsticks);
                }
            }
        }

        $(window).keyup(demoHandler);
        $('.toggle-demo').click(demoHandler);
    })();


    //
    // Looper
    //
    (function() {
        var $looper = $('.loop'),
            recording = false,
            startTime,
            totalTime,
            data,
            stopTimeout,
            loopInterval, loopTimeouts = [];

        $keys.on('played-note.piano', function(evt, key) {
            if (recording) {
                data.push({'key': key, 'time': new Date().getTime()});
            }
        });

        function recordStart() {
            if (!recording) {
                data = [];
                startTime = new Date().getTime();
                recording = true;
                window.clearTimeout(stopTimeout);
                stopTimeout = window.setTimeout(recordStop, 60*1000); // 1 minute max?
                $looper.addClass('active');

                // stop old loop
                window.clearInterval(loopInterval);
                $.each(loopTimeouts, function(i, x) { window.clearTimeout(x); });
            }
        }
        function recordStop() {
            if (recording) {
                recording = false;
                totalTime = new Date().getTime() - startTime;
                window.clearTimeout(stopTimeout);
                for (var i=0, len=data.length; i<len; i++) {
                    data[i].time = data[i].time - startTime;
                }
                if (data.length) {
                    playLoop(data, totalTime);
                }
                $looper.removeClass('active');
            }
        }

        function playLoop(data, totalTime) {
            loopInterval = window.setInterval(function() {
                loopTimeouts = [];
                $.each(data, function(i, x) {
                    loopTimeouts.push(window.setTimeout(function() {
                        $keys.trigger('note-'+x.key+'.play');
                    }, x.time));
                });
            }, totalTime);
        }

        $looper.mousedown(recordStart).mouseup(recordStop);

        $(window).on('keydown keyup', function(evt) {
            if (evt.which == 57 && !isModifierKey(evt)) {
                evt.type == 'keydown' ? recordStart() : recordStop();
            }
        });
    })();


    //
    // Silly colors
    //
    (function() {
        var shouldAnimate = true,
            $piano = $('#piano'),
            W = $piano.width(),
            H = 500,
            $canvas = $('<canvas>', {
                css: {
                    position: 'absolute',
                    top: ($piano.offset().top + $piano.outerHeight() - 1) + 'px',
                    left: '50%',
                    marginLeft: Math.floor(-W/2) + 'px', // need to figure this out...
                    width: W,
                    height: H
                }
            })
            .attr('width', W)
            .attr('height', H)
            .prependTo('body'),
            canvas = $canvas.get(0),
            ctx = canvas.getContext('2d');

        function choice(x) {
            return x[Math.floor(Math.random()*x.length)];
        }

        function getData(note) {
            var data = [], freq = Notes.noteToFreq(note), vol = 1, sampleRate = 2024, secs = .1;
            var volumeFn = DataGenerator.volume.default;
            var styleFn = DataGenerator.style.default;
            var maxI = sampleRate * secs;
            for (var i=0; i<maxI; i++) {
                var sf = styleFn(freq, vol, i, sampleRate, secs, maxI);
                data.push(volumeFn(
                    styleFn(freq, vol, i, sampleRate, secs, maxI),
                    freq, vol, i, sampleRate, secs, maxI));
            }
            return data;
        }

        var keyToData = {},
            keyAnimCounts = {};

        $keys.on('build-done.piano', function() {
            $keys.find('.key').each(function() {
                var key = $(this).data('key');
                keyToData[key] = getData(key);
            });
        });

        $keys.on('played-note.piano', function(evt, key, $elt) {
            if (!shouldAnimate) return;

            var eOffset = $elt.offset(),
                eWidth = $elt.width(),
                cOffset = $canvas.offset(),
                startX = (eOffset.left + eWidth/2) - cOffset.left,
                startY = 0,
                endY = 200,
                amplitude = 8,
                data = keyToData[key],
                animCount = keyAnimCounts[key] = (keyAnimCounts[key] || 0) + 1;

            if (!data) return;

            var len = data.length,
                maxTime = 500,
                stepRate = 80,
                cleanupStepDelay = 8,
                steps = Math.floor(maxTime / stepRate),
                iPerStep = len / steps,
                yPerStep = (endY - startY) / steps,
                yIncrement = yPerStep / iPerStep,
                step = 0,
                i = 0,
                color = '#' + choice('f33 33f 3f3 ff3 f3f 3ff'.split(' '));

            // startY -> endY in steps
            // each step is yPerStep = (endY - startY) / steps long
            // each step covers iPerStep = len / steps data points
            //     at an increment of yIncrement = yPerStep / iPerStep

            (function draw() {

                if (step < steps) {
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    var newMax = i + iPerStep, first = true;
                    for (; i<=newMax; i++) {
                        startY += yIncrement;
                        ctx[first ? 'moveTo' : 'lineTo'](startX + data[i]*amplitude, startY);
                        first = false;
                        if (startY > H) return;
                    }
                    i--; // keep an overlap between draws
                    startY -= yIncrement;
                    ctx.stroke();
                }

                if (keyAnimCounts[key] == animCount && step >= cleanupStepDelay) {
                    var cleanupStep = step - cleanupStepDelay;
                    ctx.clearRect(startX - amplitude - 5, yPerStep * cleanupStep,
                                  (amplitude + 5) * 2, yPerStep * (cleanupStep + 1));
                }

                if (++step < steps + cleanupStepDelay) {
                    window.setTimeout(draw, stepRate);
                }
            })();
        });

        // button
        var bW = 20,
            bH = 20,
            $loop = $('.loop'),
            $button = $('<canvas>', {
                css: {
                    position: 'absolute',
                    top: (parseInt($loop.css('top')) + 1) + 'px',
                    right: (parseInt($loop.css('right')) + 34) + 'px',
                    width: bW,
                    height: bH,
                    cursor: 'pointer'
                }
            })
            .attr('width', bW)
            .attr('height', bH)
            .appendTo('#piano'),
            button = $button.get(0),
            bctx = button.getContext('2d'),
            coords = [
                [15, 1],
                [5, 9],
                [9, 11],
                [5, 19],
                [15, 11],
                [11, 9]
            ],
            coordsLen = coords.length;

        bctx.strokeStyle = 'rgba(0,0,0,.5)';
        bctx.lineWidth = .5;

        function draw() {
            bctx.fillStyle = shouldAnimate ? 'rgba(255,255,0,.75)' : 'rgba(0,0,0,.25)';
            bctx.clearRect(0, 0, bW, bH);
            bctx.beginPath();
            for (var i=0; i<coordsLen; i++) {
                bctx[i == 0 ? 'moveTo' : 'lineTo'](coords[i][0], coords[i][1]);
            }
            bctx.closePath();
            if (shouldAnimate) bctx.stroke();
            bctx.fill();
        }
        draw();

        // handlers
        function toggleAnimate(evt) {
            if (evt.type === 'click' || (evt.keyCode == 56 && !isModifierKey(evt))) {
                shouldAnimate = !shouldAnimate;
                draw();
            }
        }
        $(window).keyup(toggleAnimate);
        $('.toggle-animate').click(toggleAnimate);
        $button.click(toggleAnimate);
    })();

    if (isIos) {
        $(function() {
            var $note = $('<div>', {
                'class': 'note',
                'text': 'Note: sound does not work on iOS, but you can still enjoy pretty wave forms!'
            }).appendTo('body');

            window.setTimeout(function() {
                $note.fadeOut();
            }, 6000);
        });
    }



    // the below code was a failed experiment to support iOS...

    // //
    // // Generate files for dl...
    // //

    // function generateFilesForDL() {
    //     // backup solution for iOS... since they won't play my files :'(
    //     // add audio elts to page and then download them all!
    //     // https://addons.mozilla.org/en-US/firefox/addon/downthemall/?src=search

    //     for (var i=0; i<5; i++) {
    //         var dataURI = Notes.getDataURI(i);
    //         $('body').prepend("<br><br>");
    //         $('<audio>', {controls: 'controls'})
    //             .append('Note ' + i)
    //             .append($('<source>', {
    //                 src: dataURI,
    //                 type: 'audio/wav'
    //             }))
    //             .prependTo('body');
    //         $('body').prepend(i + ": ");
    //     }

    //     $('body').prepend("<br><br>");
    //     $('<audio>', {controls: 'controls', src: 'note.caf', type: 'audio/wav'}).prependTo('body');
    //     $('body').prepend("note: ");

    // }
    // generateFilesForDL();

})();
