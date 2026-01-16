export function closest(el, selector) {
  var matchesSelector =
    el.matches ||
    el.webkitMatchesSelector ||
    el.mozMatchesSelector ||
    el.msMatchesSelector;
  while (el) {
    if (matchesSelector.call(el, selector)) {
      break;
    }
    el = el.parentElement;
  }
  return el;
}
/**
 * 获取当前执行对象的上一个元素
 */
export function prev(ele) {
  var nearEle = ele["previousSibling"];
  while (nearEle) {
    if (nearEle.nodeType === 1) {
      return nearEle;
    }
    nearEle = nearEle["previousSibling"];
    if (!nearEle) {
      break;
    }
  }
  return null;
}

export function isInArray(arr, val) {
  var i, iLen;
  if (!(arr instanceof Array) || arr.length === 0) {
    return false;
  }
  if (typeof Array.prototype.indexOf === "function") {
    return !!~arr.indexOf(val);
  }
  for (i = 0, iLen = arr.length; i < iLen; i++) {
    if (val === arr[i]) {
      return true;
    }
  }
  return false;
}

export function getValByOtherVal(obj, val, prop1, prop2) {
  var data = "";
  if (obj && obj.length) {
    obj.forEach(v => {
      if (v[prop1] == val) {
        data = v[prop2];
      }
    });
  }
  return data;
}

export function getIndexByName(obj, prop, name) {
  var data = 0;
  if (obj && obj.length) {
    obj.forEach((v, indexs) => {
      if (v[prop] == name) {
        data = indexs;
      }
    });
  }
  return data;
}

export function formatDD(obj, formatStr) {
  var date = obj;
  var str = formatStr;
  //判断是否为空，return ‘’；
  if (date) {
    date = new Date(date);
    str = str.replace(/yyyy|YYYY/, date.getFullYear());
    str = str.replace(
      /yy|YY/,
      date.getYear() % 100 > 9
        ? (date.getYear() % 100).toString()
        : "0" + (date.getYear() % 100)
    );
    str = str.replace(
      /MM/,
      date.getMonth() > 8
        ? (date.getMonth() + 1).toString()
        : "0" + (date.getMonth() + 1)
    );
    str = str.replace(/M/g, date.getMonth() + 1);
    str = str.replace(
      /dd|DD/,
      date.getDate() > 9 ? date.getDate().toString() : "0" + date.getDate()
    );
    str = str.replace(/d|D/g, date.getDate());
    str = str.replace(
      /hh|HH/,
      date.getHours() > 9 ? date.getHours().toString() : "0" + date.getHours()
    );
    str = str.replace(/h|H/g, date.getHours());
    str = str.replace(
      /mm/,
      date.getMinutes() > 9
        ? date.getMinutes().toString()
        : "0" + date.getMinutes()
    );
    str = str.replace(/m/g, date.getMinutes());
    str = str.replace(
      /ss|SS/,
      date.getSeconds() > 9
        ? date.getSeconds().toString()
        : "0" + date.getSeconds()
    );
    str = str.replace(/s|S/g, date.getSeconds());
  } else {
    str = "";
  }
  return str;
}

export function deepClone(origin, target) {
  var target = target || {};
  for (var prop in target) {
    if (target.hasOwnProperty(prop)) {
      if (target[prop] !== null && typeof target[prop] === "object") {
        origin[prop] =
          Object.prototype.toString.call(target[prop]) === "[object Array]"
            ? []
            : {};

        deepClone(origin[prop], target[prop]);
      } else {
        origin[prop] = target[prop];
      }
    }
  }
}

export const getObjType = obj => {
  var toString = Object.prototype.toString;
  var map = {
    "[object Boolean]": "boolean",
    "[object Number]": "number",
    "[object String]": "string",
    "[object Function]": "function",
    "[object Array]": "array",
    "[object Date]": "date",
    "[object RegExp]": "regExp",
    "[object Undefined]": "undefined",
    "[object Null]": "null",
    "[object Object]": "object"
  };
  if (obj instanceof Element) {
    return "element";
  }
  return map[toString.call(obj)];
};
/**
 * 对象深拷贝
 */
export const deepCopy = data => {
  var type = getObjType(data);
  var obj;
  if (type === "array") {
    obj = [];
  } else if (type === "object") {
    obj = {};
  } else {
    // 不再具有下一层次
    return data;
  }
  if (type === "array") {
    for (var i = 0, len = data.length; i < len; i++) {
      obj.push(deepCopy(data[i]));
    }
  } else if (type === "object") {
    for (var key in data) {
      obj[key] = deepCopy(data[key]);
    }
  }
  return obj;
};

// 清空数据
export function clearData(data: any, arr: any) {

  function clear(data: any, item: any) {
    if (typeof data[item] == "string" || typeof data[item] == "number") {
      data[item] = "";
    } else if (typeof data[item] == "object" && data[item] != null) {
      clearData(data[item]);
    }
  }

  switch (typeof data) {
    case "object":
      Object.keys(data).forEach((item, index) => {
        if (arr && arr.length > 0) {
          for (let item_ of arr) {
            if (item_ == item) {
              clear(data, item);
            }
          }
        } else {
          clear(data, item);
        }
      });
      break;
  }
}

export function changeArray(obj) {
  var oData = [];
  if (typeof obj != "object") {
    obj = obj.split(",");
    if (obj && obj.length) {
      obj.forEach((item, i) => {
        oData.push(item);
      });
    }
  } else {
    oData = obj;
  }
  return oData;
}

export function changeSpring(obj) {
  var oData = "";
  if (obj && obj.length) {
    obj.forEach((item, i) => {
      if (i < obj.length - 1) {
        oData += item + ",";
      } else {
        oData += item;
      }
    });
  }
  return oData;
}

export function aClick(url) {
  var a = document.createElement("a");
  a.target = "_blank";
  a.href = url;
  a.click();
}

export function hideIdcard(str) {
  if (str) {
    str = str.replace(/(\w{10})\w*(\w{2})/, "$1******$2");
  }
  return str;
}

export function hidePhone(str) {
  var pat = /(\d{3})\d*(\d{4})/;
  if (str) {
    str = str.replace(pat, "$1****$2");
  }
  return str;
}

export function exportExcel(data, name) {
  var blob = new Blob([data], {
    type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
  }); // application/vnd.openxmlformats-officedocument.spreadsheetml.sheet这里表示xlsx类型
  var downloadElement = document.createElement("a");
  var href = window.URL.createObjectURL(blob); // 创建下载的链接
  downloadElement.href = href;
  downloadElement.download = name + ".xls"; // 下载后文件名
  document.body.appendChild(downloadElement);
  downloadElement.click(); // 点击下载
  document.body.removeChild(downloadElement); // 下载完成移除元素
  window.URL.revokeObjectURL(href); // 释放掉blob对象
}

export const Util = {
  lStorage: {
    /*
        localStorage只支持字符串，如果要放json，请先使用JSON.stringify()转换
        读取使用JSON.parse()读取
        */
    setParam: function (name, value) {
      localStorage.setItem(name, value);
    },
    getParam: function (name) {
      return localStorage.getItem(name);
    },
    removeParam: function (name) {
      localStorage.removeItem(name);
    },
    clearParam: function () {
      //清除所有的存储，谨慎使用
      localStorage.clear();
    },
    paramSize: function () {
      return localStorage.length;
    }
  },
  getlSToken: function () {
    var token = Util.sStorage.getParam("userToken") || "";
    if (token) return token;
    else return null;
  }
};

export const IsEmpty = function (obj) {
  if (obj) {
    obj = obj.toString().replace(/\s/g, "").length > 0;
  } else {
    obj = false;
  }
  return obj;
};
export const addOneHours = function () {
  var d = new Date();
  var t = d.getTime();
  t += 3600000; //一个小时的毫秒数
  d = new Date(t);
  return d;
};
export const addSecond = function (time, n) {
  var d = new Date(time);
  var t = d.getTime();
  t += n * 1000; //一个小时的毫秒数
  d = new Date(t);
  return d;
};

export const getTenMins = function () {
  var obj = [];
  var date1 = new Date();

  for (var i = 30; i >= 0; i--) {
    var oDate = formatDD(date1.getTime() - 60000 * i, "hh:mm");
    obj.push(oDate);
  }
  return obj;
};

export const getThirtyDay = function () {
  var obj = [];
  var date1 = new Date();

  for (var i = 30; i >= 0; i--) {
    var oDate = formatDD(date1.getTime() - 3600000 * 24 * i, "yyyy-MM-DD");
    obj.push(oDate);
  }
  return obj;
};

export const chunk = function (arr, size) {
  const list = [];
  let current = [];
  arr.forEach(t => {
    current.push(t);
    if (current.length === size) {
      list.push(current);
      current = [];
    }
  });
  if (current.length) {
    list.push(current);
  }
  return list;
};

export const timeForMat = function (count) {
  // 拼接时间
  let time1 = new Date()
  time1.setTime(time1.getTime() - (24 * 60 * 60 * 1000))
  let Y1 = time1.getFullYear()
  let M1 = ((time1.getMonth() + 1) >= 10 ? (time1.getMonth() + 1) : '0' + (time1.getMonth() + 1))
  let D1 = (time1.getDate() >= 10 ? time1.getDate() : '0' + time1.getDate())
  let timer1 = Y1 + '-' + M1 + '-' + D1 // 当前时间
  let time2 = new Date()
  time2.setTime(time2.getTime() - (24 * 60 * 60 * 1000 * count))
  let Y2 = time2.getFullYear()
  let M2 = ((time2.getMonth() + 1) >= 10 ? (time2.getMonth() + 1) : '0' + (time2.getMonth() + 1))
  let D2 = (time2.getDate() >= 10 ? time2.getDate() : '0' + time2.getDate())
  let timer2 = Y2 + '-' + M2 + '-' + D2 // 之前的7天或者30天
  return {
    t1: timer1,
    t2: timer2
  }
}

export const getDateList = (day: any, year = new Date()) => {
  var date = new Date(year);
  var nextYear = date.getFullYear() + 1;
  var dateList = [];
  while (date.getDay() != day) {
    date.setDate(date.getDate() + 1)
  }

  while (date.getFullYear() < nextYear) {
    var yyyy = date.getFullYear();

    var mm = (date.getMonth() + 1);
    mm = (mm < 10) ? '0' + mm : mm;

    var dd = date.getDate();
    dd = (dd < 10) ? '0' + dd : dd;

    // console.log(yyyy + '-' + mm + '-' + dd)
    dateList.push(yyyy + '-' + mm + '-' + dd)
    date.setDate(date.getDate() + 7);
  }
  return dateList;
}
// 高德地图转百度地图经纬度
export const GdMapToBdMap = function (lat, lng) {
  var x_pi = 3.14159265358979324 * 3000.0 / 180.0;
  var z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * x_pi);
  var theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * x_pi);
  var bd_lng = z * Math.cos(theta) + 0.0065;
  var bd_lat = z * Math.sin(theta) + 0.006;
  return {
    lng: bd_lng,
    lat: bd_lat
  };
};
