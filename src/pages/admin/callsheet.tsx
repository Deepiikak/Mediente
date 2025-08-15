type timeTableType={
    item:string,
    date:Date,
}[] 
type locationType={
location_tittle: string,
link: string,
address:string,
contact_number:number

}[]
type sheduleTableType={
    time:Date,
    scene:string,
    description:string

}[]
type CallSheetType= {
    movie_name: string,
    date: Date,
    call_to: string,
    time:Date,
    time_table:timeTableType,
    description?:string
    location:locationType,
    shedule:sheduleTableType
   
}