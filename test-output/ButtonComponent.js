"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
require("./ButtonComponent.css");
const ButtonComponent = ({ children = "Click Me", variant = "primary", size = "medium", disabled = false, onClick, }) => {
    return (<button className={`component-button ${className}`} onClick={onClick} disabled={disabled}>{children}</button>);
};
exports.default = ButtonComponent;
//# sourceMappingURL=ButtonComponent.js.map