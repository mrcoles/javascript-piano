
// paulirish.com/2009/log-a-lightweight-wrapper-for-consolelog/
window.log = function f(){ log.history = log.history || []; log.history.push(arguments); if(this.console) { var args = arguments, newarr; args.callee = args.callee.caller; newarr = [].slice.call(args); if (typeof console.log === 'object') log.apply.call(console.log, console, newarr); else console.log.apply(console, newarr);}};
// make it safe to use console.log always
(function(a){function b(){}for(var c="assert,count,debug,dir,dirxml,error,exception,group,groupCollapsed,groupEnd,info,log,markTimeline,profile,profileEnd,time,timeEnd,trace,warn".split(","),d;!!(d=c.pop());){a[d]=a[d]||b;}})
(function(){try{console.log();return window.console;}catch(a){return (window.console={});}}());


(function() {

    function asBytes(value, bytes) {
        // Convert value into little endian hex bytes
        // value - the number as a decimal integer (representing bytes)
        // bytes - the number of bytes that this value takes up in a string

        // Example:
        // asBytes(2835, 4)
        // > '\x13\x0b\x00\x00'
        var result = [];
        for (; bytes>0; bytes--) {
            result.push(String.fromCharCode(value & 255));
            value >>= 8;
        }
        return result.join('');
    }

    var DataGenerator = $.extend(function(styleFn, volumeFn, cfg) {
        cfg = $.extend({
            freq: 440,
            volume: 32767,
            sampleRate: 2024, // Hz
            seconds: .5,
            channels: 1
        }, cfg);

        var data = [];
        var maxI = cfg.sampleRate * cfg.seconds;
        for (var i=0; i < maxI; i++) {
            for (var j=0; j < cfg.channels; j++) {
                data.push(
                    asBytes(
                        volumeFn(
                            styleFn(cfg.freq, cfg.volume, i, cfg.sampleRate, cfg.seconds, maxI),
                            cfg.freq, cfg.volume, i, cfg.sampleRate, cfg.seconds, maxI
                        ), 2
                    )
                );
            }
        }
        return data;
    }, {
        style: {
            wave: function(freq, volume, i, sampleRate, seconds) {
                // wave
                // i = 0 -> 0
                // i = (sampleRate/freq)/4 -> 1
                // i = (sampleRate/freq)/2 -> 0
                // i = (sampleRate/freq)*3/4 -> -1
                // i = (sampleRate/freq) -> 0
                return Math.sin((2 * Math.PI) * (i / sampleRate) * freq);
            },
            squareWave: function(freq, volume, i, sampleRate, seconds, maxI) {
                // square
                // i = 0 -> 1
                // i = (sampleRate/freq)/4 -> 1
                // i = (sampleRate/freq)/2 -> -1
                // i = (sampleRate/freq)*3/4 -> -1
                // i = (sampleRate/freq) -> 1
                var coef = sampleRate / freq;
                return (i % coef) / coef < .5 ? 1 : -1;
            },
            triangleWave: function(freq, volume, i, sampleRate, seconds, maxI) {
                return Math.asin(Math.sin((2 * Math.PI) * (i / sampleRate) * freq));
            },
            sawtoothWave: function(freq, volume, i, sampleRate, seconds, maxI) {
                // sawtooth
                // i = 0 -> -1
                // i = (sampleRate/freq)/4 -> -.5
                // i = (sampleRate/freq)/2 -> 0
                // i = (sampleRate/freq)*3/4 -> .5
                // i = (sampleRate/freq) - delta -> 1
                var coef = sampleRate / freq;
                return -1 + 2 * ((i % coef) / coef);
            }
        },
        volume: {
            flat: function(data, freq, volume) {
                return volume * data;
            },
            linearFade: function(data, freq, volume, i, sampleRate, seconds, maxI) {
                return volume * ((maxI - i) / maxI) * data;
            },
            quadraticFade: function(data, freq, volume, i, sampleRate, seconds, maxI) {
                // y = -a(x - m)(x + m); and given point (m, 0)
                // y = -(1/m^2)*x^2 + 1;
                return volume * ((-1/Math.pow(maxI, 2))*Math.pow(i, 2) + 1) * data;
            }
        }
    });
    DataGenerator.style.default = DataGenerator.style.wave;
    DataGenerator.volume.default = DataGenerator.volume.linearFade;


    function toDataURI(cfg) {

        cfg = $.extend({
            channels: 1,
            sampleRate: 2024, // Hz
            bitDepth: 16, // bits/sample
            seconds: .5,
            volume: 20000,//32767,
            freq: 440
        }, cfg);

        //
        // Format Sub-Chunk
        //

        var fmtChunk = [
            'fmt ', // sub-chunk identifier
            asBytes(16, 4), // chunk-length
            asBytes(1, 2), // audio format (1 is linear quantization)
            asBytes(cfg.channels, 2),
            asBytes(cfg.sampleRate, 4),
            asBytes(cfg.sampleRate * cfg.channels * cfg.bitDepth / 8, 4), // byte rate
            asBytes(cfg.channels * cfg.bitDepth / 8, 2),
            asBytes(cfg.bitDepth, 2)
        ].join('');

        //
        // Data Sub-Chunk
        //

        var sampleData = DataGenerator(
            cfg.styleFn || DataGenerator.style.default,
            cfg.volumeFn || DataGenerator.volume.default,
            cfg);
        var samples = sampleData.length;

        var dataChunk = [
            'data', // sub-chunk identifier
            asBytes(samples * cfg.channels * cfg.bitDepth / 8, 4), // chunk length
            sampleData.join('')
        ].join('');

        //
        // Header + Sub-Chunks
        //

        var data = [
            'RIFF',
            asBytes(4 + (8 + fmtChunk.length) + (8 + dataChunk.length), 4),
            'WAVE',
            fmtChunk,
            dataChunk
        ].join('');

        return 'data:audio/wav;base64,' + btoa(data);
    }

    function noteToFreq(stepsFromMiddleC) {
        return 440 * Math.pow(2, (stepsFromMiddleC+3) / 12);
    }

    var Notes = {
        sounds: {},
        getDataURI: function(n, cfg) {
            cfg = cfg || {};
            cfg.freq = noteToFreq(n);
            return toDataURI(cfg);
        },
        getCachedSound: function(n, data) {
            var key = n, cfg;
            if (data && typeof data == "object") {
                cfg = data;
                var l = [];
                for (var attr in data) {
                    l.push(attr);
                    l.push(data[attr]);
                }
                l.sort();
                key += '-' + l.join('-');
            } else if (typeof data != 'undefined') {
                key = n + '.' + key;
            }

            var sound = this.sounds[key];
            if (!sound) {
                sound = this.sounds[key] = new Audio(this.getDataURI(n, cfg));
            }
            return sound;
        },
        noteToFreq: noteToFreq
    };

    window.DataGenerator = DataGenerator;
    window.Notes = Notes;
})();
