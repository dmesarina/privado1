/*jslint es5: true*/
/*global armsym, beforeEach, expect, describe, it*/

describe('MemoryManager', function () {
    'use strict';
    
    var MemoryManager = armsym.MemoryManager;
    
    function random(min, max) {
        return Math.floor(Math.random() * (max - min) + min);
    }
    
    describe('on construction', function () {
        it('should let me set a custom memory page size', function () {
            var size = 64, mm = new MemoryManager(size);
            expect(mm.pageSize()).to.equal(size);
        });

        it('should let me set a different memory page size', function () {
            var size = random(64, 128), mm = new MemoryManager(size);
            expect(mm.pageSize()).to.equal(size);
        });

        it('should use the DEFAULT_PAGE_SIZE if no page size value is provided', function () {
            expect(new MemoryManager().pageSize()).to.equal(armsym.DEFAULT_PAGE_SIZE);
        });

        it('should throw InvalidPageSizeError if any value less than zero is passed as page size', function () {
            expect(function () {
                return new MemoryManager(random(-10, -5));
            }).to.throw(armsym.InvalidPageSizeError);
        });

        it('should throw InvalidPageSizeError if zero is passed as page size', function () {
            expect(function () {
                return new MemoryManager(0);
            }).to.throw(armsym.InvalidPageSizeError);
        });

        it('should throw InvalidPageSizeError if any fractional value is passed as page size', function () {
            expect(function () {
                return new MemoryManager(Math.random() + Math.PI);
            }).to.throw(armsym.InvalidPageSizeError);
        });

        it('should throw InvalidPageSizeError if a non numeric value is passed as page size', function () {
            expect(function () {
                return new MemoryManager({});
            }).to.throw(armsym.InvalidPageSizeError);
        });

        it('should have a real size of zero when created', function () {
            expect(new MemoryManager().realSize()).to.equal(0);
        });

        it('should have a virtual size of zero when created', function () {
            expect(new MemoryManager().virtualSize()).to.equal(0);
        });
    });
    
    describe('on read and write bit', function () {
        var mm;
        
        beforeEach(function () {
            mm = new MemoryManager();
        });
        
        it('should throw OverflowError whenever attempting to write a value other than 0 or 1', function () {
            expect(function () {
                mm.writeBit(0x0, random(2, 100));
            }).to.throw(armsym.OverflowError);
        });
        
        it('should throw OverflowError whenever attempting to write a negative value', function () {
            expect(function () {
                mm.writeBit(0x0, -random(2, 100));
            }).to.throw(armsym.OverflowError);
        });
        
        it('should not throw AlignmentError when writing to any address within a 32 bit word', function () {
            function write(index) {
                mm.writeBit(index, 1);
            }
            
            expect(function () {
                var i;
                
                for (i = 0x0; i < 0x20; i += 1) {
                    write(i);
                }
            }).to.not.throw(armsym.AlignmentError);
        });
        
        it('should read a value of zero on non initialized memory addresses', function () {
            expect(mm.readBit(random(0x0, 0x20))).to.equal(0);
        });
        
        it('should read the value written to the 0x0 address', function () {
            mm.writeBit(0x0, 1);
            expect(mm.readBit(0x0)).to.equal(1);
        });
        
        it('should read the value written to any address other than 0x0 on page zero', function () {
            var address = random(1, armsym.DEFAULT_PAGE_SIZE - 1);
            mm.writeBit(address, 1);
            expect(mm.readBit(address)).to.equal(1);
        });
        
        it('should read the value written to any address on any page other than page zero', function () {
            var address = random(1, 4096);
            mm.writeBit(address, 1);
            expect(mm.readBit(address)).to.equal(1);
        });
        
        function assert(mm, index, value) {
            expect(mm.readBit(index)).to.equal(value);
        }
        
        it('should not alter the zero values of other bits on the same byte when writing a one', function () {
            var i, address = random(0, 7);
            mm.writeBit(address, 1);
            
            for (i = 0; i < 8; i += 1) {
                assert(mm, i, i === address ? 1 : 0);
            }
        });
        
        it('should not alter the zero values of other bits on the same byte when writing a zero', function () {
            var i, address = random(0, 7);
            mm.writeBit(address, 0);
            
            for (i = 0; i < 8; i += 1) {
                assert(mm, i, 0);
            }
        });
        
        it('should not alter the one values of other bits on the same byte when writing a one', function () {
            var i, address = random(0, 7), address2 = random(0, 7);
            
            while (address2 === address) {
                address2 = random(0, 7);
            }
            
            mm.writeBit(address, 1);
            mm.writeBit(address2, 1);
            
            for (i = 0; i < 8; i += 1) {
                assert(mm, i, i === address || i === address2 ? 1 : 0);
            }
        });
        
        it('should not alter the one values of other bits on the same byte when writing a zero', function () {
            var i, address = random(0, 7), address2 = random(0, 7);
            
            while (address2 === address) {
                address2 = random(0, 7);
            }
            
            mm.writeBit(address, 1);
            mm.writeBit(address2, 0);
            
            for (i = 0; i < 8; i += 1) {
                assert(mm, i, i === address ? 1 : 0);
            }
        });
        
        it('should be able to overwrite a value', function () {
            var address = random(0, 7);
            mm.writeBit(address, 1);
            expect(mm.readBit(address)).to.equal(1);
            mm.writeBit(address, 0);
            expect(mm.readBit(address)).to.equal(0);
        });
    });
    
    describe('on read and write byte', function () {
        var mm, n;
        
        beforeEach(function () {
            mm = new MemoryManager();
            n = random(1, 100);
        });
        
        it('should throw an AlignmentError when attempting to read from a non aligned address', function () {
            expect(function () {
                mm.readByte(random(1, 7));
            }).to.throw(armsym.AlignmentError);
        });
        
        it('should throw an AlignmentError when attempting to write to a non aligned address', function () {
            expect(function () {
                mm.writeByte(random(1, 7), 0x1);
            }).to.throw(armsym.AlignmentError);
        });
        
        it('should read a value of zero on non initialized memory addresses', function () {
            expect(mm.readByte(random(0, 100) * 0x8)).to.equal(0);
        });
        
        it('should throw an OverflowError when attempting to write a value bigger than 0xff', function () {
            expect(function () {
                mm.writeByte(0x0, 0xff + random(1, 50));
            }).to.throw(armsym.OverflowError);
        });
        
        it('should read the value written to the 0x0 address', function () {
            mm.writeByte(0x0, n);
            expect(mm.readByte(0x0)).to.equal(n);
        });
        
        it('should read the value written to any address other than 0x0 on page zero', function () {
            var address = random(1, 15) * 0x8;
            mm.writeByte(address, n);
            expect(mm.readByte(address)).to.equal(n);
        });
        
        it('should read the value written to any address on any page other than page zero', function () {
            var address = random(16, 512) * 0x8;
            mm.writeByte(address, n);
            expect(mm.readByte(address)).to.equal(n);
        });
        
        it('should be able to overwrite a a value', function () {
            var address = random(0, 15) * 0x8, n2 = random(101, 255);
            mm.writeByte(address, n);
            expect(mm.readByte(address)).to.equal(n);
            mm.writeByte(address, n2);
            expect(mm.readByte(address)).to.equal(n2);
        });
    });
    
    describe('on read and write short', function () {
        var mm, n;
        
        beforeEach(function () {
            mm = new MemoryManager();
            n = random(1, 100);
        });
        
        it('should throw an AlignmentError when attempting to read from a non aligned address', function () {
            expect(function () {
                mm.readShort(random(1, 15));
            }).to.throw(armsym.AlignmentError);
        });
        
        it('should throw an AlignmentError when attempting to write to a non aligned address', function () {
            expect(function () {
                mm.writeShort(random(1, 15), 0x1);
            }).to.throw(armsym.AlignmentError);
        });
        
        it('should read a value of zero on non initialized memory addresses', function () {
            expect(mm.readShort(random(0, 100) * 0x10)).to.equal(0);
        });
        
        it('should throw an OverflowError when attempting to write a value bigger than 0xffff', function () {
            expect(function () {
                mm.writeShort(0x0, 0xffff + random(1, 50));
            }).to.throw(armsym.OverflowError);
        });
        
        it('should read the value written to the 0x0 address', function () {
            mm.writeShort(0x0, n);
            expect(mm.readShort(0x0)).to.equal(n);
        });
        
        it('should read the value written to any address other than 0x0 on page zero', function () {
            var address = random(1, 7) * 0x10;
            mm.writeShort(address, n);
            expect(mm.readShort(address)).to.equal(n);
        });
        
        it('should read the value written to any address on any page other than page zero', function () {
            var address = random(8, 256) * 0x10;
            mm.writeShort(address, n);
            expect(mm.readShort(address)).to.equal(n);
        });
        
        it('should be able to overwrite a a value', function () {
            var address = random(0, 15) * 0x10, n2 = random(101, 255);
            mm.writeShort(address, n);
            expect(mm.readShort(address)).to.equal(n);
            mm.writeShort(address, n2);
            expect(mm.readShort(address)).to.equal(n2);
        });
    });
    
    describe('on read and write int', function () {
        var mm, n;
        
        beforeEach(function () {
            mm = new MemoryManager();
            n = random(1, 100);
        });
        
        it('should throw an AlignmentError when attempting to read from a non aligned address', function () {
            expect(function () {
                mm.readInt(random(1, 31));
            }).to.throw(armsym.AlignmentError);
        });
        
        it('should throw an AlignmentError when attempting to write to a non aligned address', function () {
            expect(function () {
                mm.writeInt(random(1, 31), 0x1);
            }).to.throw(armsym.AlignmentError);
        });
        
        it('should read a value of zero on non initialized memory addresses', function () {
            expect(mm.readInt(random(0, 100) * 0x20)).to.equal(0);
        });
        
        it('should read the value written to the 0x0 address', function () {
            mm.writeInt(0x0, n);
            expect(mm.readInt(0x0)).to.equal(n);
        });
        
        it('should read the value written to any address other than 0x0 on page zero', function () {
            var address = random(1, 3) * 0x20;
            mm.writeInt(address, n);
            expect(mm.readInt(address)).to.equal(n);
        });
        
        it('should read the value written to any address on any page other than page zero', function () {
            var address = random(32, 128) * 0x20;
            mm.writeInt(address, n);
            expect(mm.readInt(address)).to.equal(n);
        });
        
        it('should be able to overwrite a a value', function () {
            var address = random(0, 3) * 0x20, n2 = random(101, 255);
            mm.writeInt(address, n);
            expect(mm.readInt(address)).to.equal(n);
            mm.writeInt(address, n2);
            expect(mm.readInt(address)).to.equal(n2);
        });
    });
});
