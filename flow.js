function createFlow(container, data, toolTipRender) {

        let maxWidth = 0;
        let maxHeight = 0;
        const gutter = 40 // 横向间隔
        const verticalGuttter = 100 //纵向间隔
        const fontGutter = 5
        const rectStrokeWidth = 1.5 //块border宽度 用于计算 line的起始坐标 需要 rectY + rectHeight + rectStrokeWidth/2
        const rectHeight = 40
        const rectPadding = 10
        const strokeWidth = 2
        const arrowOriginHeight = 5
        const endNodeLine = 40
        let rects = ""
        let lines = ""
        let minX = 0

        const endObj = {}
        //计算文本宽／高属性
        function messureText(content, className) {
            const span = document.createElement('span')
            span.className = className
            span.innerHTML = content
            document.body.appendChild(span)
            const width = span.offsetWidth
            const height = span.offsetHeight
            document.body.removeChild(span)
            return { width, height }
        }

        function cutText(content) {
            return content.length > 10 ? content.slice(0, 10) + '...' : content
        }

        function calcLevel(data, level = 0) {
            for (const node of data) {
                node.level = level
                if (node.type != 'end') {
                    if (endObj[node.level] === undefined) {
                        endObj[node.level] = [node]
                    } else {
                        endObj[node.level].push(node)
                    }
                }
                if (node.children) {
                    calcLevel(node.children, level + 1)
                }
            }
        }


        //计算节点坐标
        function coordinate(data, level = 0, initialX = 0, realWidth) {

            // 对于end节点做处理
            for (const node of data) {
                if (node.children && node.children.length > 0) {
                    const index = node.children.findIndex(c => c.type == "end")
                    if (index !== -1) {
                        node.endVO = node.children[index]
                        node.children.splice(index, 1)
                    }
                }
            }

            // 计算坐标
            for (let i = 0; i < data.length; i++) {
                const node = data[i]
                const rectWidth = messureText(cutText(node.label), 'messure').width
                node.rectWidth = rectWidth
                node.x = initialX
                node.y = level * verticalGuttter + rectStrokeWidth / 2
                node.level = level
                node.realWidth = Math.max(realWidth || 0, rectWidth)

                //end 节点 方向设置， 以及实际宽度 增加
                if (node.endVO && node.children && node.children.length === 0) {
                    node.endDirect = 'bottom'
                }

                if (node.children && node.children.length > 0) {
                    if (node.children.length === 1) {
                        coordinate(node.children, level + 1, initialX, node.realWidth)
                    } else {
                        coordinate(node.children, level + 1, initialX)
                    }

                    let newX = initialX
                    for (const item of node.children) {
                        newX += item.realWidth + gutter
                    }
                    if (node.endVO) {
                        if (endObj[node.level].length > 1 && endObj[node.level].findIndex(c => c == node) === 0) {
                            node.endDirect = 'left'
                        } else {
                            node.endDirect = 'right'
                        }
                    }
                    node.realWidth = Math.max(node.realWidth, newX - initialX - gutter)
                }
                initialX += node.realWidth + gutter


            }
        }


        function moveToCenter(data) {
            for (const node of data) {
                if (node.children && node.children.length > 0) {
                    moveToCenter(node.children)
                    const start = node.children[0].x2 + node.children[0].rectWidth / 2
                    const end = node.children[node.children.length - 1].x2 + node.children[node.children.length - 1].rectWidth / 2
                    node.x2 = (start + end - node.rectWidth) / 2

                    //计算产生最小的x坐标
                    if (node.endDirect == 'left') {
                        const endBlockWidth = messureText(node.endVO.label || 'END', 'messure').width
                        const endX = node.x2 - (endBlockWidth + endNodeLine + 3 / 2 * rectStrokeWidth + arrowOriginHeight * strokeWidth);
                        minX = Math.min(endX, minX)
                    } else {
                        minX = Math.min(node.x2, minX)
                    }
                } else {
                    node.x2 = node.x + node.realWidth / 2 - node.rectWidth / 2
                }
            }
        }

        function fixRightEnd(data, initialX = 0) {
            for (const node of data) {
                node.x3 = initialX
                let delta = 0
                if (node.endDirect === 'right') {
                    const endWidth = endNodeLine + arrowOriginHeight * strokeWidth + messureText(node.endVO.label || 'END', 'messure').width
                    let a = node.x2 + node.rectWidth + endWidth
                    let b = node.x + node.realWidth
                    delta = a - b
                }
                node.realWidth += delta
                if (node.children && node.children.length > 0) {
                    if (node.children.length === 1) {
                        fixRightEnd(node.children, initialX, node.realWidth)
                    } else {
                        fixRightEnd(node.children, initialX)
                    }
                    let newX = initialX
                    for (const item of node.children) {
                        newX += item.realWidth + gutter
                    }
                    node.realWidth = Math.max(node.realWidth, newX - initialX - gutter)
                }
                initialX += node.realWidth + gutter
            }
        }

        function moveToCenter2(data) {
            for (const node of data) {
                if (node.children && node.children.length > 0) {
                    moveToCenter2(node.children)
                    node.x2 += node.x3 - node.x
                    const a = node.children[0];
                    const b = node.children[node.children.length - 1]
                    const start = a.x2 + a.rectWidth / 2
                    const end = b.x2 + b.rectWidth / 2
                    node.x2 = (start + end - node.rectWidth) / 2
                } else {
                    node.x2 += node.x3 - node.x
                }
            }
        }


        function changeX(data) {
            for (const node of data) {
                if (node.children) {
                    changeX(node.children)
                }
                if (node.x != undefined) {
                    node.x = node.x2 - minX + rectStrokeWidth / 2
                }
            }
        }

        let allNodes = []
        function drawBlock(data) {
            for (const node of data) {
                allNodes.push(node)
                rects += `<g class="node" data-index="${allNodes.length - 1}"> <rect  rx="6" ry="6" x=${node.x} y=${node.y} width=${node.rectWidth} height=${rectHeight}></rect>
                <g transform="translate(${node.x + rectPadding},${node.y + rectPadding})">
                    <text  >
                        <tspan dy="1em">${cutText(node.label)}</tspan>
                    </text>
                </g></g>`
                maxWidth = Math.max(maxWidth, node.x + node.rectWidth + rectStrokeWidth / 2)
                maxHeight = Math.max(maxHeight, node.y + rectHeight + rectStrokeWidth / 2)
                if (node.children) {
                    drawBlock(node.children)
                }
            }
        }

        function drawLine(data) {
            for (const node of data) {
                const px = node.x + node.rectWidth / 2
                const py = node.y + rectHeight + rectStrokeWidth / 2
                if (node.children && node.children.length > 0) {
                    const num = node.children.length == 1 ? 1 : node.children.length == 2 ? 2 : 3
                    for (let i = 0; i < node.children.length; i++) {
                        const child = node.children[i]
                        const cx = child.x + child.rectWidth / 2
                        const cy = child.y
                        let fx, fy, str = ""
                        const condition = child.condition || '任意'
                        const conditionWidth = messureText(condition, 'noPaddingMessure').width
                        const conditionHeight = messureText(condition, 'noPaddingMessure').height
                        let realLineHeight = verticalGuttter - rectHeight - rectStrokeWidth - arrowOriginHeight * strokeWidth
                        if (num == 1) {
                            str = `v${realLineHeight}`
                            fx = cx + fontGutter
                            fy = cy - conditionHeight / 4 - realLineHeight / 2
                        }
                        if (num == 2) {
                            realLineHeight -= 12
                            fx = (px + cx) / 2 - conditionWidth / 2
                            fy = cy - realLineHeight / 2 - conditionHeight - fontGutter
                            if (cx > px) {
                                fx = fx < px ? px + 10 : fx
                                str = `v${realLineHeight / 2} c0 0 0 6 6 6 h${cx - px - 12} c0 0 6 0 6 6 v${realLineHeight / 2}`
                            } else {
                                fx = fx + conditionWidth > px ? px - fontGutter - conditionWidth : fx
                                str = `v${realLineHeight / 2} c0 0 0 6 -6 6 h${cx - px + 12} c0 0 -6 0 -6 6 v${realLineHeight / 2}`
                            }
                        }
                        if (num == 3) {
                            if (i === 0 || i === node.children.length - 1) {
                                if (cx > px) {
                                    str = `v${realLineHeight / 2} h${cx - px - 6} c0 0 6 0 6 6 v${realLineHeight / 2 - 6}`
                                } else {
                                    str = `v${realLineHeight / 2} h${cx - px + 6} c0 0 -6 0 -6 6 v${realLineHeight / 2 - 6}`
                                }
                            } else {
                                str = `v${realLineHeight / 2} h${cx - px} v${realLineHeight / 2}`
                            }
                            fx = cx + fontGutter
                            fy = cy - verticalGuttter / 4 + conditionHeight / 2
                        }

                        lines += `<g class="edgePath">
                            <path d="M${px} ${py} ${str}" style="fill:none" marker-end="url(#arrow)"></path>
                            <g transform="translate(${fx},${fy})">
                                <text>
                                    ${condition}
                                </text>
                            </g>
                        </g>`
                    }
                    drawLine(node.children)
                }
            }
        }


        function drawEnd(data) {
            for (const node of data) {
                if (node.endVO) {
                    const condition = node.endVO.condition || '拒绝'
                    const conditionWidth = messureText(condition, 'noPaddingMessure').width
                    const conditionHeight = messureText(condition, 'noPaddingMessure').height
                    let sx, sy
                    const endBlockWidth = messureText(node.endVO.label || 'END', 'messure').width
                    if (node.endDirect === 'bottom') {
                        sx = node.x + node.rectWidth / 2 - endBlockWidth / 2;
                        sy = (node.level + 1) * verticalGuttter + rectStrokeWidth / 2
                    } else if (node.endDirect === 'left') {
                        sx = node.x - (endBlockWidth + endNodeLine + arrowOriginHeight * strokeWidth);
                        sy = node.y;
                    } else {
                        sx = node.x + node.rectWidth + endNodeLine + rectStrokeWidth / 2 + arrowOriginHeight * strokeWidth
                        sy = node.y;
                    }


                    rects += `<g class="node endnode">
                            <rect rx="6" ry="6" x=${sx} y=${sy} width=${endBlockWidth} height=${rectHeight}></rect>
                            <g transform="translate(${sx + rectPadding},${sy + rectPadding})">
                                <text>
                                    <tspan dy="1em">${node.endVO.label || 'END'}</tspan>
                                </text>
                            </g>
                        </g>`
                    let ex, ey, str, fx, fy;
                    let realLineHeight = verticalGuttter - rectHeight - rectStrokeWidth - arrowOriginHeight * strokeWidth
                    if (node.endDirect === 'bottom') {
                        ex = node.x + node.rectWidth / 2;
                        ey = node.y + rectHeight + rectStrokeWidth / 2;
                        fx = ex + fontGutter;
                        fy = sy - conditionHeight - realLineHeight / 2
                        str = `v${realLineHeight}`;
                    }
                    if (node.endDirect === 'left') {
                        ex = node.x - rectStrokeWidth / 2;
                        ey = node.y + rectHeight / 2;
                        fx = ex - endNodeLine / 2 - conditionWidth / 2;
                        fy = ey - conditionHeight;
                        str = `h-${endNodeLine}`;
                    }
                    if (node.endDirect === 'right') {
                        ex = node.x + node.rectWidth + rectStrokeWidth / 2;
                        ey = node.y + rectHeight / 2;
                        fx = ex + endNodeLine / 2 - conditionWidth / 2;
                        fy = ey - conditionHeight;
                        str = `h${endNodeLine}`;
                    }
                    lines += `<g class="edgePath">
                        <path d="M${ex} ${ey} ${str}" style="fill:none" marker-end="url(#arrow)"></path>
                        <g transform="translate(${fx},${fy})">
                            <text>
                                <tspan dy="1em">${condition}</tspan>
                            </text>
                        </g>
                    </g>`

                    //计算maxWidth
                    maxWidth = Math.max(maxWidth, sx + endBlockWidth + rectStrokeWidth / 2)
                    maxHeight = Math.max(maxHeight, node.y + rectHeight + rectStrokeWidth / 2)
                }
                if (node.children && node.children.length > 0) {
                    drawEnd(node.children)
                }
            }
        }
        calcLevel(data)
        coordinate(data)
        moveToCenter(data)
        fixRightEnd(data)
        console.log(data)
        moveToCenter2(data)
        changeX(data)
        drawLine(data)
        drawBlock(data)
        drawEnd(data)
        container.innerHTML = `<svg style="cursor:default;width:${maxWidth}px;height:${maxHeight}px"><defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refx="0" refy="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L5,3 z" fill="#18a4da" />
            </marker>
        </defs><g id="flowNodes" class="nodes" onmousemove="handleSvgMouseOver(event)" onmouseout="handleSvgMouseOut(event)">${rects}</g><g class="edgePaths">${lines}</g></svg>`

        const flowNodes = document.getElementById('flowNodes')
        flowNodes.onmousemove = function (e) {

            function getNodeIndex(node) {
                if (node.className.baseVal === 'node') {
                    return node.dataset.index
                }
                if (node.className.baseVal === 'nodes') {
                    return undefined
                }
                return getNodeIndex(node.parentNode)
            }

            let div = document.getElementById('svgtooltip')
            if (!div) {
                div = document.createElement('div')
                div.id = 'svgtooltip'
                document.body.appendChild(div)
            }
            const index = getNodeIndex(e.target)
            if (index !== undefined) {
                const nodeData = allNodes[index];
                const content = toolTipRender ? toolTipRender(nodeData, div) : nodeData.title ? nodeData.title : ''
                if (!content) {
                    return
                }
                if (content instanceof Promise) {
                    div.innerHTML = '加载中'
                    flowNodes._promise = content
                    content.then(d => {
                        if (flowNodes._promise === content) { //保护当前promise对象
                            div.innerHTML = d
                        }
                    }, e => {
                        if (flowNodes._promise === content) {
                            div.style.display = 'none'
                        }
                    })
                } else {
                    div.innerHTML = content
                }
                let divX, divY
                const divRect = div.getBoundingClientRect()
                xdirect = e.pageX + 15 + divRect.width - (document.documentElement.scrollLeft + document.documentElement.clientWidth) > 0 ? 'left' : 'right'
                divX = xdirect === 'left' ? e.pageX - 10 - div.offsetWidth : e.pageX + 15
                ydirect = e.pageY + 15 + divRect.height - (document.documentElement.scrollTop + document.documentElement.clientHeight) > 0 ? 'top' : 'bottom'
                divY = ydirect === 'top' ? e.pageY - 10 - div.offsetHeight : e.pageY + 15
                div.style.transform = `translate(${divX}px,${divY}px)`;
                div.style.opacity = '1'
                div.style.display = 'block'
            }
        }
        flowNodes.onmouseout = function (e) {
            let div = document.getElementById('svgtooltip')
            if (div) {
                div.style.opacity = '0'
            }
        }
    }
