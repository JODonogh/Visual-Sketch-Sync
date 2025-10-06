"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./ButtonButton_primary.css");
const ButtonButton_primary = ({ children = "Click Me", variant = "primary", size = "medium", disabled = false, onClick, rounded = true, }) => {
    return (<button className={`button_primary-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>);
};
exports.default = ButtonButton_primary;
//# sourceMappingURL=ButtonButton_primary.js.map