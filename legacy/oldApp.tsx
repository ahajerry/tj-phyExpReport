import {useState} from "react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {Trash2,Check,Copy} from "lucide-react";
import {BlockMath,InlineMath} from "react-katex";
import {Bar,BarChart,CartesianGrid,XAxis,YAxis,} from "recharts";
import {ChartContainer,ChartTooltip,ChartTooltipContent,} from "@/components/ui/chart"

type Row = {
  id: string
  value : string
}

type CopyButtonProps = {
  text:string
}

function createEmptyRow(): Row{
  return {
    id: crypto.randomUUID(),
    value: "",
  }
}

function CopyButton(props: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  //useState(初始值)
  async function handleCopy(): Promise<void>{
    try{
      await navigator.clipboard.writeText(props.text)
      setCopied(true)
      window.setTimeout(() => setCopied(false),1500)
    }
    catch(error){
      console.error("复制失败：",error)
    }}
    
    let buttonIcon = <Copy />
    let buttonText = "复制"
    if (copied){
      buttonIcon = <Check />
      buttonText = "成功！"
    }
    //复制成功以后按钮会发生小变化

    return(
      <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
        {buttonIcon}
        {buttonText}
      </Button>
    )
}

export default function App(){
  const [rows, setRows] = useState<Row[]>(
    () => [createEmptyRow(),])
  //初始化，创建rows数组，其中的每一个元素都是Row类型，并且先放一个空行进去


  const data = rows
    .filter((row) => row.value.trim() !== "")//非空
    .map((row) => +row.value)//把字符串变成数字
    .filter(Number.isFinite)//删掉坏值
    /*数组.filter()的用法
    const 新数组=旧数组.filter(判断条件)
    filter按照条件一个个判断并输出一个新数组
    */
    //创建真正可用的数据组
  let plotData = [];
  for (let i:number=0;i<data.length;i++){
    plotData.push({
      index: i.toString(),
      value: data[i]})
  }

  function updateRow(id:string, newValue:string){
    //整个函数只是利用useState定义的函数来更新,并设置最后一行
    //setRows有两种更新方式:1.setRows(newRows),其中newRows是预先声明的新状态
    //2.传入一个更新函数setRows((a) => 一些代码 return newRows),其中react会自动将当前数组传入a
    setRows((currentRows) => {
      const updatedRows = currentRows.map((row) =>
        row.id === id
        ? {...row, value: newValue}
        : row,
      )
      const lastRow = updatedRows.at(-1)
      
      if (lastRow?.value.trim() !== "") {
        return [...updatedRows, createEmptyRow()]
      }

      return updatedRows
    })
  }

  function deleteRow(id:string) {
    setRows((currentRows) => {
      const remainingRows = currentRows.filter(
        (row) => row.id !== id,
      )

      if (remainingRows.length == 0) {
        return [createEmptyRow()]
      }

      const lastRow = remainingRows.at(-1);
      if (lastRow?.value.trim() !== ""){
        return [...remainingRows, createEmptyRow()]
      }

      return remainingRows
    })
  }

  //计算模块
  let sum: number = 0;
  let mean: number = 0;
  let sd: number = 0;
  let u_a: number = 0;
  let n: number = data.length;
  let fixNum: number = 1;
  //求和
  sum = Math.sumPrecise(data)

  //求平均值
  if (n != 0){
    mean = sum / data.length;
  }

  if (n >1){
    //求标准差
    let j: number = 0;
    for (const i of data){
      j = j + (mean - i)**2
    }
    sd = Math.sqrt(j/(n-1))
    //求A类不确定度
    u_a = +(sd/Math.sqrt(n)).toFixed(2)
    if ((u_a.toString().at(1) !== "2")||(u_a.toString().at(1) !== "1")){
      u_a = +((+u_a).toFixed(1))
      fixNum = 1
    }
    else {fixNum = 2}

    sum = +(sum.toFixed(fixNum));
    mean = +(mean.toFixed(fixNum));
    sd = +(sd.toFixed(fixNum));
  }

  
  //画图
  function Plot1() {
    return(
      <ChartContainer config={{
        value: {label:"测量值",color:"var(--chart-1)",},}}
        className="h-[260px] w-full">
          <BarChart accessibilityLayer data={plotData}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="index" tickLine={false} axisLine={false} tickMargin={8} label={{value:"测量次数",position:"insideBottom",offset:-5,}} />
            <YAxis tickLine={false} axisLine={false} width={40} domain={[0,"auto"]} label={{value:"测量值",angle:-90,position:"insideLeft",}} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4,4,0,0]} />

          </BarChart>
        </ChartContainer>
    )
  }


  return(
    <main className="mx-auto max-w-md space-y-6 p-4">
      <section className="space-y-2">
        {rows.map((row, index) => {
          const isOnlyEmptyRow = rows.length ===1 && row.value === ""

          return(
            <div key={row.id} className="flex items-center gap-2">
              <span className="w-6 text-right text-sm text-muted-foreground">
                {index + 1}
              </span>

              <div className="relative flex-1">
                <Input type="number"
                  inputMode="decimal"
                  step="any"
                  value={row.value}
                  placeholder="输入"
                  className="pr-12"
                  onChange={(event) =>
                    updateRow(row.id, event.target.value)
                  }/>
                
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  s
                </span>
              </div>

              <Button type="button"
                variant="outline"
                size="icon"
                disabled={isOnlyEmptyRow}
                onClick={() => deleteRow(row.id)}
                aria-label={"删除"}>
                  <Trash2 />
                </Button>
            </div>
          )
        })}
      </section>

      <section className="rounded-lg bg-muted p-4">
        <p className="text-sm font-medium">当前</p>
        <div className="flex items-center justify-between">
          <span>求和：{sum}</span>
          <CopyButton text={sum} />
        </div>

        <div className="flex items-center justify-between">
          <span>平均值：{mean}</span>
          <CopyButton text={mean} />
        </div>

        <div className="flex items-center justify-between">
          <span>标准差：{sd}</span>
          <CopyButton text={sd} />
        </div>

        <div className="flex items-center justify-between">
          <span>A类不确定度：{u_a}</span>
          <CopyButton text={u_a} />
        </div>
      </section>

      <section className="rounded-lg bg-muted p-4">
        <p className="text-sm font-medium">参考公式 使用
          <InlineMath math="\LaTeX" />
          渲染
        </p>
        <BlockMath math="u_A (x) = \sqrt{\frac{\sum_{i=1}^n ( \bar{x} -x_i )^2}{n(n - 1)}}" />
      </section>

      <section className="rounded-xl border bg-card p-4">
        <div className="mb-4">
          <p className="text-sm text-muted-forground">数据可视化</p>
        </div>
        <Plot1 data={plotData} />
        
      </section>
    </main>
  )
}

/*
export default function App(){
  return (
  <>
  <main className="imn-h-screen bg-slate-50 p-4">
  <h1 className="text-2xl font-bold text-slate-900">
    大雾实验计算器
  </h1>
  <div>{sum}</div>
  <div>{mean}</div>
  <div>{sd}</div>
  <div>{u_a}</div>
  </main>



  </>
  );
  return (
    <>
    <Input />
    </>
  )
}*/
