// 发布订阅
class Dep{
    constructor(){
        this.subs=[]//存放观察者
    }
    // 订阅
    addSub(watcher){
        this.subs.push(watcher);//存放观察者
    }
    // 发布
    notify(){
        this.subs.forEach(watcher=>watcher.updata())

    }
}

// 观察者
class Watcher{
    constructor(vm,expr,cd){
        this.vm=vm;
        this.expr=expr;
        this.cd=cd;
        this.oldVal=this.get()
    }
    get(){
        // 这里的this是Watcher
        Dep.target=this;
        // 获取老值
        let value=Complieutil.getval(this.expr,this.vm)
        // 释放
        Dep.target=null;
        return value
    }

    // 更新数据
    updata(){
        let newVal=Complieutil.getval(this.expr,this.vm)
        if(newVal!==this.oldVal){
            // 这里的this是一个回调
            this.cd(newVal)
        }
    }
}




//编写observer类
class Observer{
    //把数据属性变成访问属性
    constructor(data){
        this.observer(data);
    }
    //处理数据
    observer(data){
        //判断传入的数据类型是否是一个对象 还是一个空
        if(data&&typeof data==="Object"){
            for(let key in data){
                //传走一个数据  一个键值  键值后面的内容
                this.defineReact(data,key,data[key])
            }
        }
    }
    defineReact(obj,key,value){
        //递归调用  万一下面还有值再次调用
        this.observer(value);

        // 给每个都添加监听
        let dep=new Dep()

        // 访问器属性
        Object.defineProperty(obj,key,{//obj访问器数组  key键值名

            //用get获取到value值
            get(){
                // 如果么有就添加观察者
                Dep.target&&dep.addSub(Dep.target);
                return value

            },
            //想更改值
            set(newVal){
                if(newVal!==value){//判断新传来的值若不等于当前值
                    this.observer(newVal);
                    value=newVal//覆盖当前值
                    dep.notify();//发布
                }
            }

        })


    }

}





//指令解析
class Compile{
    constructor(el,vm){
        //判断el是否是一个元素
        this.el=this.isElementNode(el)?el:document.querySelector(el);
        //这里的vm就是this
        this.vm=vm

        //把节点存到内存中去  变成一个文档碎片
        let frament=this.nodeframs(this.el)

          //编译模板数据
          this.complie(frament) 

        //把文档碎片中的内容读出
        this.el.appendChild(frament)


             


    }
    //判断是否是一个元素节点
    isElementNode(el){
        //如果元素节点类型是1  证明是一个元素
        return el.nodeType===1;
    }

    //核心编译数据
    complie(node){
        //获取所有的子节点
        let childNodes=node.childNodes;
        //循环所有的子节点
        [...childNodes].forEach(item=>{
            //判断是否是节点
            if(this.isElementNode(item)){
                //元素节点
               
                //处理元素节点
                this.complieElement(item)
                //可能元素节点下面还嵌套了子节点
                this.complie(item)
            }else{
                //是文本节点
                //处理文本节点
                this.complieText(item)
            }
    
        })        
    }

    //匹配前面是v-的字母  要找到v-model
    isStarts(name){
        return name.startsWith("v-");
    }
    //处理元素节点
    complieElement(node){
        // console.log(node)
        //获取元素属性的集合
      let attribute=node.attributes;
    //   console.log(node.attributes);
    
      //循环元素集合  
      [...attribute].forEach(item=>{
        //   console.log(item)
        // name是属性名 value是属性值
          let {name,value:expr}=item 
          //如果匹配到v-什么的属性
        if(this.isStarts(name)){
            //切割找后面的model   [v,model]
            let [,moactive]=name.split("-")//model
            //万一v-model:  model后面还有东西 切割前面的
            let [mofirst,]=moactive.split(":");

            //复用代码  
            // node是input框  expr是v-model后面的属性值  this.vm是实例vm
            Complieutil[mofirst](node,expr,this.vm)            
        }
      })
        

    }

    //处理文本节点
    complieText(node){
        // 获取所有的文本节点
        let content=node.textContent;

        // 正则匹配 如果两边是{{}}的留下来
        if(/\{\{(.+?)\}\}/.test(content)){
        // console.log(node)
        // content=》{{className.name}}{{className.age}}
        Complieutil["Text"](node,content,this.vm)            
        }
        
    }
    //因为页面会产生多次刷新 避免这种情况 就要把节点存在内存中
    nodeframs(node){
        //创建内存碎片
        let frament=document.createDocumentFragment();
        let firstChild;
        //循环第一个节点  是否等于节点的第一个节点
        while(firstChild=node.firstChild){
            //依次把节点添加进内存碎片里
            frament.appendChild(firstChild);
        }
        return frament
    }



}


   //共用代码
Complieutil={
    // expr是属性值  vm是实例
    getval(expr,vm){
        // 从.开始分割开  去循环  ["classname","name"]
        return expr.split(".").reduce((data,current)=>{
            // console.log(data[current])//=>{name: "小纪", age: 20}
        return data[current]
        },vm.data)

    },
    setval(vm,expr,value){
        // 从.开始分割开  去循环  ["classname","name"]
        return expr.split(".").reduce((data,current,index,arr)=>{
            // 修改最后一个
            if(index===arr.length-1){
                // console.log(value)
                return data[current]=value
            }
        return data[current]
        },vm.data)

    },
    // 元素节点
    model(node,expr,vm){
        let value=this.getval(expr,vm);
        // node.value=value
        // 传参更新属性节点
        let fn=this.upDater["modelupdate"]
        // 每次更新节点的时候去监听
        // vm是Vue实例  expr是calssName.name   newVal是watch传来的值
        // 给输入框添加观察者   如果更新这个数据就会触发            
        new Watcher(vm,expr,(newVal)=>{
            // node是input框节点 newVal是watch传来的值
            fn(node,newVal)
        })
        fn(node,value)
        node.addEventListener('input',(e)=>{

            let value=e.target.value;

            
            this.setval(vm,expr,value)
        })
    },
    // 文本节点
    Text(node,content,vm){
        // console.log(content)
        // 替换content文件节点里面的值
        // 传参更新文本节点
       let fn=this.upDater["textupdate"]
        let value=content.replace(/\{\{(.+?)\}\}/g,(...args)=>{
            // console.log(args[1])
            new Watcher(vm,args[1],(newVal)=>{
                fn(node,newVal)

            })
            return this.getval(args[1],vm)
        })
        fn(node,value)



    },
    //更新数据
    upDater: {
        // 更新元素节点
        modelupdate(node, value) {
            node.value = value
        },
        // 更新文本节点
        textupdate(node, value) {
            node.textContent = value
        }

    } 

} 




class Vue{
    constructor(options){//接收一个对象
        this.el=options.el;//获取的节点属性
        this.data=options.data;//获取的访问器数据
        if(this.el){//如果传过来的节点有值
            //数据劫持  把数据处理化
            new Observer(this.data)

            //指令解析
            new Compile(this.el,this)

        }

    }
}