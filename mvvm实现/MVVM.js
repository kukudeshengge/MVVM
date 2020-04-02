class Dep{//观察者模式代码
    constructor(){
        this.subs = [] //存储订阅者，存储传进来的观察者
    }
    addSub(watcher){//订阅 let watcher = new Wathcer()
        this.subs.push(watcher)//存储观察者
    }
    notify(){//发布
        this.subs.forEach(watcher => {
            watcher.update()
        })
    }
}
class Watcher{
    constructor(vm,expr,cb){
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        this.oldData = this.get()
    }
    get(){
        Dep.target = this
        let value = ComplieUtil.getVal(this.vm,this.expr);
        Dep.target = null
        return value
    }
    update(){
        let newVal = ComplieUtil.getVal(this.vm,this.expr);
        if(newVal !== this.oldData){
            this.cb(newVal)
        }
    }
}
class Observer {
    constructor(data) {
        this.observer(data);
    }
    observer(data) {
        if (data && typeof data === 'object') {
            for (let key in data) {
                this.defineReactive(data, key, data[key]);
            }
        }
    }
    defineReactive(obj, key, value) {
        this.observer(value);
        let dep = new Dep();
        Object.defineProperty(obj, key, {
            get() {
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => {
                // console.log(newVal,"newVal")
                if (newVal !== value) {
                    this.observer(newVal)//补充
                    value = newVal;
                    dep.notify();//发布功能
                }
            }
        })
    }
}
//基类调度
class Complie {
    constructor(el, vm) {
        //判断el属性是不是⼀个元素 如果不是元素 那就获取它
        this.el = this.isElementNode(el) ? el : document.querySelector(el); //1
        //保证所有⼈拿到实例vm
        this.vm = vm;
        //把当前节点中的元素放到内存中
        let fragment = this.node2fragment(this.el); //2
        //⽤数据编译模板
        this.compile(fragment); //4
        //把内容塞到⻚⾯中
        this.el.appendChild(fragment) //3
    }
    //判断是不是元素节点
    isElementNode(node) {
        return node.nodeType === 1;
    }
    //把每个节点都放⼊到内存中
    node2fragment(node) {
        //创建⼀个⽂档碎⽚
        let fragment = document.createDocumentFragment();
        let firstChild;
        while (firstChild = node.firstChild) {
            //appendChild具有移动性
            fragment.appendChild(firstChild)
        }
        return fragment
    }
    //核⼼的编译⽅法
    compile(node) { //⽤来编译内存的dom节点
        let childNodes = node.childNodes;
        [...childNodes].forEach(child => {
            //判断是否为节点
            if (this.isElementNode(child)) {
                // 属性节点方法
                //type="text" v-model="className.name"
                this.compileElement(child);
                //如果是元素的话 需要传⼊⾃⼰然后遍历⼦节点
                this.compile(child)
            } else {
                //处理文本节点
                //{{className.name}}
                this.compileText(child);
            }
        });
    }
    //编译元素节点下的属性节点
    //type="text" v-model="className.name"
    isDirective(attrName){
        return attrName.startsWith('v-')
    }
    //元素节点 <input type v-model/> <h1> <h3> <ul>
    compileElement(node){
        let attributes = node.attributes;
        [...attributes].forEach(attr => {
            //[type:'text',v-model:'className.name']
            let {name,value:expr} = attr;//重命名
            // console.log(expr)
            if(this.isDirective(name)){//v-model: v-html
                let [,directive] = name.split('-');
                // [,directive] = [v,model]
                // [a,b]=[b,a]
                // console.log(directive)
                let [directiveName,] = directive.split(":")
                //这个方法为了复用 代码优化 model
                //对应 129行 <input />
                ComplieUtil[directiveName](node,expr,this.vm)
            }
        })
    }
    //文本节点
    //{{className.name}}
    compileText(node){
        let content = node.textContent;
        // console.log(content)正则表达式 {{className.name}}
        if(/\{\{(.+?)\}\}/.test(content)){
            //"{{className.name}}"
            ComplieUtil['text'](node,content,this.vm)
        }
    }
}
ComplieUtil = {
    getVal(vm,expr){//className.name
        return expr.split('.').reduce((data,current)=>{
            return data[current]//1707班
        },vm.$data)
    },
    setVal(vm,expr,value){
        // [className,name]
        expr.split('.').reduce((data,current,index,arr)=>{
            if(index === arr.length - 1){
                return data[current] = value//1707班
            }
            return data[current]
        },vm.$data)
    },
    model(node,expr,vm){
        let fn = this.updater['modelUpdater']
        new Watcher(vm,expr,(newVal)=>{
            // 给输入框添加观察者，如果数据更新就会触发这个方法，会拿到新的值
            fn(node,newVal)
        })
        let value = this.getVal(vm,expr)
        fn(node,value)
        node.addEventListener('input',(e)=>{
            let value = e.target.value;
            this.setVal(vm,expr,value)
        })
    },
    text(node,expr,vm){
        let fn = this.updater["textUpdater"]
        let value = expr.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            new Watcher(vm,args[1],(newVal)=>{
                fn(node,newVal)
            })
            return this.getVal(vm,args[1])
        })
        fn(node,value)
    },
    updater:{
        modelUpdater(node,value){
           node.value = value
        },
        textUpdater(node,value){
            node.textContent = value
        },
    }
}
//基类 调度
class Vue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        //这个跟元素存在
        if (this.$el) {
            //数据劫持  把数据属性转换成访问器属性
            new Observer(this.$data)
            new Complie(this.$el, this)
        }
    }
}