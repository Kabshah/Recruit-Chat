"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

function ScheduleUI() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");
  
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/candidate/booked-slots")
      .then(res => res.json())
      .then(data => {
        if (data.bookedSlots) setBookedSlots(data.bookedSlots);
      })
      .catch(console.error);
  }, []);

  // Generate next 5 business days
  const upcomingDays = [];
  const today = new Date();
  let daysAdded = 0;
  let cursor = new Date(today);
  
  while (daysAdded < 5) {
    cursor.setDate(cursor.getDate() + 1);
    // Skip weekends
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) {
      upcomingDays.push(new Date(cursor));
      daysAdded++;
    }
  }

  const handleConfirm = async () => {
    if (!id) return;
    setError(null);
    setIsSubmitting(true);
    
    let slotStr = "";

    if (isCustomMode) {
      if (!customDate || !customTime) {
        setError("Please completely pick both a date and a time.");
        setIsSubmitting(false);
        return;
      }
      const d = new Date(customDate + "T" + customTime);
      const day = d.getDay();
      if (day === 0 || day === 6) {
        setError("Office is closed on weekends. Please select a valid weekday (Monday - Friday).");
        setIsSubmitting(false);
        return;
      }
      const hrs = d.getHours();
      const mins = d.getMinutes();
      
      // Strict rule: After lunch (2PM) and before closing (finish by 5PM so start before 4:30PM)
      if (hrs < 14 || hrs >= 17 || (hrs === 16 && mins > 30)) {
        setError("Strict office policy: Interviews can only be scheduled between 2:00 PM and 4:30 PM.");
        setIsSubmitting(false);
        return;
      }
      
      const formattedDate = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      let formattedHrs = hrs % 12;
      if (formattedHrs === 0) formattedHrs = 12;
      const formattedMins = mins.toString().padStart(2, '0');
      slotStr = `${formattedDate} at ${formattedHrs.toString().padStart(2, '0')}:${formattedMins} ${ampm}`;
      
      if (bookedSlots.includes(slotStr)) {
        setError("This exact slot is actively booked by another candidate. Please choose a different time.");
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!selectedDate || !selectedTime) {
        setIsSubmitting(false);
        return;
      }
      const dateObj = new Date(selectedDate);
      const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      slotStr = `${dateStr} at ${selectedTime}`;
    }

    try {
      const res = await fetch(`/api/candidate/confirm-interview?id=${id}&slot=${encodeURIComponent(slotStr)}`);
      if (res.ok) {
        setIsSuccess(true);
      } else {
        setError("Failed to confirm booking. Please try again or contact the recruiter.");
      }
    } catch (e) {
      setError("Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!id) {
    return <div className="min-h-screen flex items-center justify-center p-6 text-neutral-500 font-medium">Invalid or expired scheduling link.</div>;
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F9F9FC] flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-12 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] text-center max-w-md w-full border border-neutral-100 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-[0_10px_30px_rgba(34,197,94,0.3)]">✓</div>
          <h1 className="text-2xl font-bold text-[#1A2E46] mb-3">Meeting Scheduled!</h1>
          <p className="text-neutral-500 mb-6">Your interview has been perfectly synchronized with the recruiter's dashboard.</p>
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 font-semibold text-[#1A2E46] mb-6">
            {new Date(selectedDate!).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at {selectedTime}
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">You may close this window</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9FC] flex flex-col items-center justify-center p-6 font-sans text-[#1A2E46]">
      <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-neutral-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Info */}
        <div className="md:w-[35%] bg-white p-8 md:p-10 border-b md:border-b-0 md:border-r border-neutral-100 flex flex-col justify-center">
          <div className="w-12 h-12 bg-orange-100 text-accent rounded-xl flex items-center justify-center mb-6">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">RecruitChat AI</p>
          <h1 className="text-2xl font-bold mb-4">Technical Interview</h1>
          <div className="flex items-center gap-3 text-neutral-500 font-medium mb-3">
             <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             30 min
          </div>
          <div className="flex items-center gap-3 text-neutral-500 font-medium mb-6">
             <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
             Secure Video Call
          </div>
          <p className="text-sm text-neutral-500 leading-relaxed font-medium">Please select a date and time that works best for you. The recruiter will be notified instantly upon confirmation.</p>
        </div>

        {/* Right Side: Calendar Picker */}
        <div className="md:w-[65%] p-8 md:p-10 bg-neutral-50/30">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-[#1A2E46]">{isCustomMode ? "Pick Custom Date & Time" : "Select a Date"}</h2>
            <button onClick={() => { setIsCustomMode(!isCustomMode); setError(null); }} className="text-sm font-bold text-accent hover:opacity-80 transition-opacity flex items-center gap-1.5">
              {isCustomMode ? "Use Quick Slots" : "Request Custom Time"}
            </button>
          </div>
          
          {error && <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 italic animate-in fade-in zoom-in-95">{error}</div>}

          {isCustomMode ? (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300 relative">
                <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm mb-6">
                  <div className="mb-5">
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Custom Date</label>
                    <input 
                      type="date" 
                      value={customDate} 
                      min={new Date().toISOString().split('T')[0]} 
                      onChange={e => { setCustomDate(e.target.value); setError(null); }} 
                      className="w-full bg-[#FAFAFA] border border-neutral-200 px-4 py-3 rounded-xl font-medium focus:outline-accent" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Custom Time</label>
                    <input 
                      type="time" 
                      value={customTime} 
                      min="14:00" 
                      max="16:30" 
                      onChange={e => { setCustomTime(e.target.value); setError(null); }} 
                      className="w-full bg-[#FAFAFA] border border-neutral-200 px-4 py-3 rounded-xl font-medium focus:outline-accent" 
                    />
                    <p className="text-[11px] font-semibold text-neutral-400 mt-2 bg-neutral-100 inline-block px-2 py-1 rounded-md">
                      ⚠️ Available strictly between 2:00 PM and 4:30 PM
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleConfirm}
                  disabled={isSubmitting}
                  className="w-full bg-[#1A2E46] text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  {isSubmitting ? "Confirming..." : "Confirm Custom Booking"}
                </button>
             </div>
          ) : !selectedDate ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 flex-wrap gap-4">
              {upcomingDays.map((d, i) => (
                <button 
                  key={i}
                  onClick={() => { setSelectedDate(d.getTime()); setError(null); }}
                  className="bg-white border-2 border-neutral-100 hover:border-accent p-5 rounded-2xl flex flex-col items-start gap-1 transition-all hover:shadow-md text-left group"
                >
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-400 group-hover:text-accent transition-colors">{d.toLocaleDateString('en-US', { weekday: 'long' })}</span>
                  <span className="text-lg font-bold">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <button 
                 onClick={() => { setSelectedDate(null); setSelectedTime(null); setError(null); }}
                 className="mb-6 text-sm font-bold text-accent flex items-center gap-2 hover:opacity-80"
               >
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                 Back to Calendar
               </button>
               
               <h3 className="font-bold mb-4 flex items-center gap-2">
                 <span className="text-neutral-500 font-medium">Selected Date:</span> 
                 {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
               </h3>
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
                 {["02:00 PM", "02:45 PM", "03:30 PM", "04:15 PM"].map((time) => {
                    const dateStr = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                    const slotStr = `${dateStr} at ${time}`;
                    const isBooked = bookedSlots.includes(slotStr);

                    return (
                      <button 
                        key={time}
                        disabled={isBooked}
                        onClick={() => { setSelectedTime(time); setError(null); }}
                        className={`py-3.5 px-4 rounded-xl font-bold transition-all border-2 text-sm flex items-center justify-between ${
                          isBooked 
                           ? 'bg-neutral-100 border-neutral-100 text-neutral-400 opacity-60 cursor-not-allowed' 
                           : selectedTime === time 
                              ? 'bg-accent/10 border-accent text-accent' 
                              : 'bg-white border-neutral-200 hover:border-orange-300 text-neutral-600'
                        }`}
                      >
                        {time}
                        {isBooked && <span className="text-[10px] uppercase font-bold text-neutral-500">Booked</span>}
                      </button>
                    )
                 })}
               </div>

               {selectedTime && (
                 <div className="animate-in fade-in duration-300">
                   <button 
                     onClick={handleConfirm}
                     disabled={isSubmitting}
                     className="w-full bg-[#1A2E46] text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0"
                   >
                     {isSubmitting ? "Confirming..." : "Confirm Booking"}
                   </button>
                 </div>
               )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-6 text-neutral-500">Loading scheduling engine...</div>}>
      <ScheduleUI />
    </Suspense>
  );
}
