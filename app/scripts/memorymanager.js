/*jslint browser: true, bitwise: true*/
/*global ArrayBuffer, DataView*/

(function (namespace) {
    'use strict';
    
    var MASK_1 = 0x1,
        MASK_8 = 0xff,
        MASK_16 = 0xffff,
        MASK_32 = 0xffffffff,
        MASK_BIT_OFFSET = 0x7,
        BOUNDARY_1 = 0x1,
        BOUNDARY_8 = 0x8,
        BOUNDARY_16 = 0x10,
        BOUNDARY_32 = 0x20;
    
    function extractMapIndexes(memoryMap) {
        return Object.keys(memoryMap).map(function (e) {
            return parseInt(e, 10);
        }).sort();
    }
    
    function findClosestIndex(index, pageSize, memoryMap) {
        var keys = extractMapIndexes(memoryMap),
            closest = keys.reduce(function (previous, current) {
                return current > index ? previous : current;
            }, 0);
        return {index: closest, exists: keys.indexOf(closest) !== -1 && pageSize + closest > index};
    }
    
    function toInt(value) {
        return value & MASK_32;
    }
    
    function alignmentException(offset, boundary) {
        return new namespace.AlignmentError('Attempted to read or write at offset 0x' +  offset.toString(16) + '; not aligned to ' + boundary + ' bit boundary');
    }
    
    namespace.DEFAULT_PAGE_SIZE = 128;
    
    namespace.AlignmentError = function (message) {
        this.name = 'AlignmentError';
        this.message = message || 'An attempt was made to read or write to a non-aligned memory address';
    };
    
    namespace.AlignmentError.prototype = new Error();
    namespace.AlignmentError.constructor = namespace.AlignmentError;
    
    namespace.InvalidPageSizeError = function (message) {
        this.name = 'InvalidPageSizeError';
        this.message = message || 'An invalid page size value was used';
    };
    
    namespace.InvalidPageSizeError.prototype = new Error();
    namespace.InvalidPageSizeError.constructor = namespace.InvalidPageSizeError;
    
    namespace.OverflowError = function (message) {
        this.name = 'OverflowError';
        this.message = message || 'An attempt was made to write a value greater than supported by the operation';
    };
    
    namespace.OverflowError.prototype = new Error();
    namespace.OverflowError.constructor = namespace.OverflowError;
    
    namespace.MemoryManager = function (pageSize) {
        var memoryMap = {}, that = this;
        
        if (typeof pageSize === 'undefined') {
            pageSize = namespace.DEFAULT_PAGE_SIZE;
        }
        
        if (typeof pageSize !== 'number' || pageSize <= 0 || pageSize % 1 !== 0) {
            throw new namespace.InvalidPageSizeError(pageSize + ' is not a valid page size');
        }
        
        function createMemoryPage(offset) {
            var created = new DataView(new ArrayBuffer(pageSize));
            memoryMap[offset] = created;
            return created;
        }
        
        function checkAlignmentAndFindClosest(offset, boundary, check) {
            if (check && (offset % boundary) !== 0) {
                throw alignmentException(offset, boundary);
            }
            
            return findClosestIndex(offset, pageSize, memoryMap);
        }
        
        function read(offset, boundary, check, delegate) {
            var closest;
            offset = toInt(offset);
            closest = checkAlignmentAndFindClosest(offset, boundary, check);
            
            if (closest.exists) {
                return delegate(memoryMap[closest.index], offset - closest.index);
            }
            
            return 0;
        }
        
        this.pageSize = function () {
            return pageSize;
        };
        
        this.realSize = function () {
            return Object.keys(memoryMap).length * pageSize;
        };
        
        this.virtualSize = function () {
            var arr = extractMapIndexes(memoryMap).slice(-1);
            return arr.length > 0 ? arr[0] + pageSize : 0;
        };
        
        this.clear = function () {
            Object.keys(memoryMap).forEach(function (k) {
                memoryMap[k] = new DataView(new ArrayBuffer(pageSize));
            });
        };
        
        this.readBit = function (offset) {
            return read(offset, BOUNDARY_1, false, function (page, index) {
                var v = page.getUint8(index >> 3), offset = index & MASK_BIT_OFFSET;
                return (v >> (7 - offset)) & MASK_1;
            });
        };
        
        this.readByte = function (offset) {
            return read(offset, BOUNDARY_8, true, function (page, index) {
                return page.getUint8(index);
            });
        };
        
        this.readShort = function (offset) {
            return read(offset, BOUNDARY_16, true, function (page, index) {
                return page.getUint16(index);
            });
        };
        
        this.readInt = function (offset) {
            return read(offset, BOUNDARY_32, true, function (page, index) {
                return page.getUint32(index);
            });
        };
        
        function write(offset, value, boundary, mask, check, delegate) {
            var closest, computed;
            offset = toInt(offset) >>> 0;
            closest = checkAlignmentAndFindClosest(offset, boundary, check);
            
            if ((value >>> 0) > mask) {
                throw new namespace.OverflowError('Value 0x' + value.toString(16) + ' is larger than maximum allowed 0x' + mask.toString(16));
            }
            
            if (closest.exists) {
                delegate(memoryMap[closest.index], offset - closest.index, value & mask);
            } else {
                computed = ((offset / pageSize) >> 0) * pageSize;
                delegate(createMemoryPage(computed), offset - computed, value & mask);
            }
        }
        
        this.writeBit = function (offset, value) {
            write(offset, value, BOUNDARY_1, MASK_1, false, function (page, index, normalized) {
                var offset = index & MASK_BIT_OFFSET,
                    n = index >> 3,
                    v = page.getUint8(n),
                    t = 0x80 >> offset,
                    r = normalized === 1 ? v | t : v & ~t;
                page.setUint8(n, r);
            });
        };
        
        this.writeByte = function (offset, value) {
            write(offset, value, BOUNDARY_8, MASK_8, true, function (page, index, normalized) {
                page.setUint8(index, normalized);
            });
        };
        
        this.writeShort = function (offset, value) {
            write(offset, value, BOUNDARY_16, MASK_16, true, function (page, index, normalized) {
                page.setUint16(index, normalized);
            });
        };
        
        this.writeInt = function (offset, value) {
            write(offset, value, BOUNDARY_32, MASK_32, true, function (page, index, normalized) {
                page.setUint32(index, normalized);
            });
        };
    };
}(window.armsym = window.armsym || {}));
