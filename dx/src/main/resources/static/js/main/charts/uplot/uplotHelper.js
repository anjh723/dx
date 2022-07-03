// ============================== uplot charts ===================================
function createUplotChart(tableName, isAddLiveData, liveStartTime, shiftCnt, data) {

    let dataSeries = [];  // vo key 값.

    // series 데이터 셋팅
    for (let i = 0; i < dataKeys.length; i++) {
        dataSeries[i] = {
            label: dataTitles[i],
            stroke: graghLineColors[i]
        }                
    }

    let uplotData = new Array(data.length);

    if (data != null && data.length > 0) {
        for (let i = 0; i < dataKeys.length; i++) {
            uplotData[i] = new Array(dataKeys.length);

            for(let j = 0 ; j < data.length ; j++) {
                uplotData[i][j] = data[j][dataKeys[i]];
            }
        }
    }

    const grid = {
        show: true,
        stroke: '#000',
    };

    const tick = {
        show: true,
        stroke: '#000',
        size: 10,
    };

    let opts = {
        title: tableName + ' static data graph',
        cursor: {
            points: {
                show: false,
            }
        },
        axes: [
            {grid, tick},
            {grid, tick},
        ],
        scales: {
            x: {
                time: false
            },
        },
        plugins: [
            bgGradientPlugin({ stops: ['#666', '#000'] }),
            // gridBlurPlugin(),
            seriesMediansPlugin(),
            seriesPointsPlugin({ spikes: 6}),
            renderStatsPlugin({ textColor: 'white' })
        ],
        series: dataSeries
    };

    let u = new uPlot(opts, uplotData, document.getElementById('chart'));
    
    // 데이터 초기화
    dataSeries = [];
}

function bgGradientPlugin({ stops = ['#FFFFFF', '#CCCCCC'] } = {}) {
    function drawBg(u) {
        let { left, top, width, height } = u.bbox;
        let gradient = u.ctx.createLinearGradient(0, 0, 0, height);

        for (let c = 0; c < stops.length; c++)
            gradient.addColorStop(c, stops[c]);

        u.ctx.save();
        u.ctx.fillStyle = gradient;
        u.ctx.fillRect(left, top, width, height);
        u.ctx.restore();
    }

    return {
        hooks: {
            drawClear: drawBg,
        }
    };
}

function gridBlurPlugin({ radius = 2 } = {}) {
    function applyBlur(u) {
        let { left, top, width, height } = u.bbox;

        u.ctx.save();
        u.ctx.filter = 'blur(' + radius + 'px)';
    }

    function stopBlur(u) {
        u.ctx.restore();
    }

    return {
        hooks: {
            drawClear: applyBlur,
            drawAxes: stopBlur,
        }
    };
}

function seriesMediansPlugin({ lineWidth = 50, blur = 6 } = {}) {
    lineWidth *= devicePixelRatio;
    let medians;

    function hexToRgbA(hex, a) {
        hex = hex.replace('#', '');

        if (hex.length == 3)
            hex = hex.split('').map(c => c.repeat(2)).join('');

        let r = parseInt(hex.substring(0, 2), 16);
        let g = parseInt(hex.substring(2, 4), 16);
        let b = parseInt(hex.substring(4, 6), 16);

        return 'rgba('+r+','+g+','+b+','+a+')';
    }

    function calculateMedians(u) {
        /* medians = u.data.map(data => {
            data = [...data];
            data.sort((a, b) => a - b);
            return (data[(data.length - 1) >> 1] + data[data.length >> 1]) / 2
        }); */
    }

    function drawSeriesMedian(u, i) {
        let { ctx } = u;
        let { left, top, width, height } = u.bbox;
        let { _stroke, scale } = u.series[i];

        let cy = Math.round(u.valToPos(medians[i], scale, true));

        ctx.save();
        ctx.beginPath();
        ctx.rect(left, top, width, height);
        ctx.clip();
        ctx.strokeStyle = hexToRgbA(_stroke, 0.2);
        ctx.lineWidth = lineWidth;

        if (blur)
            ctx.filter = 'blur(' + blur + 'px)';

        ctx.beginPath();
        ctx.moveTo(left, cy);
        ctx.lineTo(left + width, cy);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    return {
        hooks: {
            setData: calculateMedians,
            drawSeries: drawSeriesMedian,
        }
    };
}

function seriesPointsPlugin({ spikes = 4, outerRadius = 8, innerRadius = 4} = {}) {
outerRadius *= devicePixelRatio;
innerRadius *= devicePixelRatio;

function drawStar(ctx, cx, cy) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);

    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }

    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
}

function drawPointsAsStars(u, i, i0, i1) {
    let { ctx } = u;
    let { _stroke, scale } = u.series[i];

    ctx.save();

    ctx.fillStyle = _stroke;

    let j = i0;

    while (j <= i1) {
        let val = u.data[i][j];
        let cx = Math.round(u.valToPos(u.data[0][j], 'x', true));
        let cy = Math.round(u.valToPos(val, scale, true));
        drawStar(ctx, cx, cy);
        ctx.fill();
        j++;
    };

    ctx.restore();
}

return {
    opts: (u, opts) => {
        opts.series.forEach((s, i) => {
            if (i > 0) {
                uPlot.assign(s, {
                    points: {
                        show: drawPointsAsStars,
                    }
                });
            }
        });
    }
};
}

function renderStatsPlugin({ textColor = 'red', font} = {}) {
font = font ?? `${Math.round(12 * devicePixelRatio)}px Arial`;

let startRenderTime;

function setStartTime() {
    startRenderTime = Date.now();
}

function drawStats(u) {
    let { ctx } = u;
    let { left, top, width, height } = u.bbox;
    let displayText = "Time to Draw: " + (Date.now() - startRenderTime) + "ms";

    ctx.save();

    ctx.font = font;
    ctx.fillStyle = textColor;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(displayText, left + 10, top + 10);

    ctx.restore();
}

return {
    hooks: {
        drawClear: setStartTime,
        draw: drawStats,
    }
};
}