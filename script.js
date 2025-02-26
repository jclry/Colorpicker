// 等待 DOM 完全加载后再初始化
document.addEventListener('DOMContentLoaded', () => {
    // 获取所有需要的 DOM 元素
    const elements = {
        colorTrigger: document.getElementById('colorTrigger'),
        colorPreview: document.getElementById('colorPreview'),
        colorText: document.getElementById('colorText'),
        colorDropdown: document.getElementById('colorDropdown'),
        colorCanvas: document.getElementById('colorCanvas'),
        pickerIndicator: document.getElementById('pickerIndicator'),
        hueThumb: document.getElementById('hueThumb'),
        alphaThumb: document.getElementById('alphaThumb'),
        alphaOverlay: document.getElementById('alphaOverlay'),
        formatInput: document.getElementById('formatInput')
    };

    // 检查所有必需的元素是否存在
    const missingElements = Object.entries(elements)
        .filter(([key, element]) => !element)
        .map(([key]) => key);

    if (missingElements.length > 0) {
        console.error('Missing elements:', missingElements);
        return;
    }

    // 如果所有元素都存在，则初始化颜色选择器
    initColorPicker(elements);
});

// 初始化颜色选择器
function initColorPicker(elements) {
    const {
        colorTrigger,
        colorPreview,
        colorText,
        colorDropdown,
        colorCanvas,
        pickerIndicator,
        hueThumb,
        alphaThumb,
        alphaOverlay,
        formatInput
    } = elements;

    // 当前颜色状态
    let currentColor = { h: 0, s: 100, v: 100, a: 1 };
    let isDragging = false;
    let isPickerActive = false;

    // HSV 转 RGB
    function hsvToRgb(h, s, v) {
        s = s / 100;
        v = v / 100;
        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);
        
        let r, g, b;
        switch (i % 6) {
            case 0: r = v; g = t; b = p; break;
            case 1: r = q; g = v; b = p; break;
            case 2: r = p; g = v; b = t; break;
            case 3: r = p; g = q; b = v; break;
            case 4: r = t; g = p; b = v; break;
            case 5: r = v; g = p; b = q; break;
        }
        
        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    // 更新颜色画布
    function updateColorCanvas() {
        const ctx = colorCanvas.getContext('2d');
        
        // 绘制饱和度和明度
        ctx.fillStyle = `hsl(${currentColor.h * 360}, 100%, 50%)`;
        ctx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
        
        // 绘制白色渐变
        const gradientWhite = ctx.createLinearGradient(0, 0, colorCanvas.width, 0);
        gradientWhite.addColorStop(0, 'rgba(255,255,255,1)');
        gradientWhite.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradientWhite;
        ctx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
        
        // 绘制黑色渐变
        const gradientBlack = ctx.createLinearGradient(0, 0, 0, colorCanvas.height);
        gradientBlack.addColorStop(0, 'rgba(0,0,0,0)');
        gradientBlack.addColorStop(1, 'rgba(0,0,0,1)');
        ctx.fillStyle = gradientBlack;
        ctx.fillRect(0, 0, colorCanvas.width, colorCanvas.height);
    }

    // 更新颜色显示
    function updateColorDisplay() {
        const rgb = hsvToRgb(currentColor.h, currentColor.s, currentColor.v);
        const alpha = Number(currentColor.a.toFixed(2));
        // 强制使用标准格式，不保留用户输入
        const rgba = `RGBA(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
        const hex = rgbToHex(rgb);
        const rgbaSolid = `RGBA(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`;
        
        colorTrigger.style.setProperty('--preview-color', rgbaSolid);
        colorPreview.style.setProperty('--preview-opacity', currentColor.a);
        colorText.value = hex;
        
        // 根据透明度决定显示格式，并强制使用标准格式
        formatInput.value = currentColor.a < 1 ? rgba : hex;
        
        alphaOverlay.style.background = `linear-gradient(to right, transparent, ${hex})`;
        document.body.style.backgroundColor = rgba;
        updatePickerPosition();
    }

    // RGB 转 Hex
    function rgbToHex(rgb) {
        const toHex = (n) => {
            const hex = n.toString(16);
            return hex.length === 1 ? '0' + hex.toUpperCase() : hex.toUpperCase();
        };
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }

    // 从画布获取颜色
    function getColorFromCanvas(e) {
        const rect = colorCanvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        
        currentColor.s = (x / rect.width) * 100;
        currentColor.v = 100 - (y / rect.height) * 100;
        
        updateColorDisplay();
    }

    // 显示下拉面板
    function showDropdown() {
        colorDropdown.classList.add('active');
        colorTrigger.parentElement.classList.add('focused');
        isPickerActive = true;
        updateColorCanvas();
        updateColorDisplay();
    }

    // 隐藏下拉面板
    function hideDropdown() {
        colorDropdown.classList.remove('active');
        colorTrigger.parentElement.classList.remove('focused');
        isPickerActive = false;
    }

    // 处理色相滑块
    function handleHueClick(e) {
        const slider = hueThumb.parentElement;
        const rect = slider.getBoundingClientRect();
        
        const handleHueMove = (e) => {
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            currentColor.h = x / rect.width;
            hueThumb.style.left = `${x}px`;
            updateColorCanvas();
            updateColorDisplay();
        };
        
        handleHueMove(e);
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleHueMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleHueMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // 处理透明度滑块
    function handleAlphaClick(e) {
        const slider = alphaThumb.parentElement;
        const rect = slider.getBoundingClientRect();
        
        const handleAlphaMove = (e) => {
            const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
            currentColor.a = Number((x / rect.width).toFixed(2));
            alphaThumb.style.left = `${x}px`;
            updateColorDisplay();
        };
        
        handleAlphaMove(e);
        
        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleAlphaMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleAlphaMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    // 初始化事件监听
    function initEvents() {
        // 文本框焦点状态
        colorText.addEventListener('focus', () => {
            colorText.parentElement.classList.add('focused');
        });

        colorText.addEventListener('blur', (e) => {
            colorText.parentElement.classList.remove('focused');
            // 失去焦点时自动补齐颜色
            const formattedColor = formatColor(e.target.value);
            updateColorFromHex(formattedColor);
        });

        // 颜色选择器点击事件
        const triggerClick = (e) => {
            e.stopPropagation();
            console.log('trigger clicked'); // 调试日志
            if (!isPickerActive) {
                showDropdown();
            } else {
                hideDropdown();
            }
        };

        // 为整个触发器区域添加点击事件
        colorTrigger.addEventListener('click', triggerClick);
        if (colorPreview) {
            colorPreview.addEventListener('click', triggerClick);
        }

        // 点击外部关闭面板
        document.addEventListener('click', (e) => {
            if (!colorDropdown.contains(e.target) && 
                !colorTrigger.contains(e.target) && 
                !colorText.contains(e.target)) {
                hideDropdown();
            }
        });

        // 颜色画布事件
        colorCanvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            getColorFromCanvas(e);
        });
        
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                getColorFromCanvas(e);
            }
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
        
        // 色相滑块事件 - 点击滑块区域和滑块thumb都生效
        const hueSlider = hueThumb.parentElement;
        hueSlider.addEventListener('mousedown', handleHueClick);
        hueThumb.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            handleHueClick(e);
        });

        // 透明度滑块事件 - 点击滑块区域和滑块thumb都生效
        const alphaSlider = alphaThumb.parentElement;
        alphaSlider.addEventListener('mousedown', handleAlphaClick);
        alphaThumb.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            handleAlphaClick(e);
        });

        // 文本框回车键处理
        colorText.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const formattedColor = formatColor(e.target.value);
                updateColorFromHex(formattedColor);
            }
        });

        // 格式输入框事件
        formatInput.addEventListener('keydown', handleFormatInput);
        formatInput.addEventListener('blur', (e) => {
            const color = parseColorInput(e.target.value);
            if (color) {
                const hsv = rgbToHsv(color.r, color.g, color.b);
                currentColor.h = hsv.h;
                currentColor.s = hsv.s;
                currentColor.v = hsv.v;
                currentColor.a = color.a;
                // 失焦时也立即更新显示，使用标准格式
                updateColorDisplay();
            } else {
                // 如果输入无效，恢复为当前颜色的标准格式
                updateColorDisplay();
            }
        });
    }

    // 初始化
    function init() {
        updateColorCanvas();
        updateColorDisplay();
        initEvents();
    }

    // 格式化颜色值
    function formatColor(color) {
        // 移除所有空格和#号
        color = color.replace(/\s/g, '').replace('#', '').toUpperCase();
        
        // 处理2位数值，重复三次 (如 FF → FFFFFF)
        if (/^[0-9A-F]{2}$/.test(color)) {
            color = color.repeat(3);
        }
        // 处理3位数值，重复两次 (如 FFF → FFFFFF)
        else if (/^[0-9A-F]{3}$/.test(color)) {
            color = color.repeat(2);
        }
        // 处理4-5位数值，补齐00 (如 FFFF → FFFF00)
        else if (/^[0-9A-F]{4,5}$/.test(color)) {
            color = color.padEnd(6, '0');
        }
        // 处理1位数值，重复6次 (如 F → FFFFFF)
        else if (/^[0-9A-F]{1}$/.test(color)) {
            color = color.repeat(6);
        }
        // 如果不是有效的颜色值，返回默认白色
        else if (!/^[0-9A-F]{6}$/.test(color)) {
            return '#FFFFFF';
        }
        
        return '#' + color;
    }

    // 从十六进制颜色更新颜色状态
    function updateColorFromHex(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        const hsv = rgbToHsv(r, g, b);
        currentColor.h = hsv.h;
        currentColor.s = hsv.s;
        currentColor.v = hsv.v;
        updateColorDisplay();
    }

    // 添加 RGB 转 HSV 的函数
    function rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;

        let h = 0;
        const s = max === 0 ? 0 : diff / max;
        const v = max;

        if (diff !== 0) {
            switch (max) {
                case r:
                    h = (g - b) / diff + (g < b ? 6 : 0);
                    break;
                case g:
                    h = (b - r) / diff + 2;
                    break;
                case b:
                    h = (r - g) / diff + 4;
                    break;
            }
            h /= 6;
        }

        return {
            h: h,
            s: s * 100,
            v: v * 100
        };
    }

    // 更新指示器位置
    function updatePickerPosition() {
        const canvasRect = colorCanvas.getBoundingClientRect();
        pickerIndicator.style.left = `${currentColor.s * canvasRect.width / 100}px`;
        pickerIndicator.style.top = `${(100 - currentColor.v) * canvasRect.height / 100}px`;
        pickerIndicator.style.backgroundColor = colorTrigger.style.backgroundColor;
        
        // 更新滑块位置
        hueThumb.style.left = `${currentColor.h * 100}%`;
        alphaThumb.style.left = `${currentColor.a * 100}%`;
    }

    // 解析颜色输入
    function parseColorInput(value) {
        // 移除所有空格，转换为大写进行解析
        value = value.trim().toUpperCase();
        
        // 尝试解析 hex
        if (value.startsWith('#') || /^[0-9A-F]{3,6}$/.test(value)) {
            const color = formatColor(value);
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return { r, g, b, a: currentColor.a };
        }
        
        // 尝试解析 rgba，忽略用户输入的格式
        const rgbaMatch = value.match(/RGBA?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)/i);
        if (rgbaMatch) {
            return {
                r: Math.min(255, parseInt(rgbaMatch[1])),
                g: Math.min(255, parseInt(rgbaMatch[2])),
                b: Math.min(255, parseInt(rgbaMatch[3])),
                a: rgbaMatch[4] ? Number(parseFloat(rgbaMatch[4]).toFixed(2)) : 1
            };
        }
        
        return null;
    }

    // 格式化颜色输入事件
    function handleFormatInput(e) {
        if (e.key === 'Enter') {
            const color = parseColorInput(e.target.value);
            if (color) {
                const hsv = rgbToHsv(color.r, color.g, color.b);
                currentColor.h = hsv.h;
                currentColor.s = hsv.s;
                currentColor.v = hsv.v;
                currentColor.a = color.a;
                // 立即更新显示，使用标准格式
                updateColorDisplay();
            }
        }
    }

    // 如果所有元素都存在，则初始化颜色选择器
    init();
}

// 确保在 DOM 加载完成后初始化
document.addEventListener('DOMContentLoaded', initColorPicker); 