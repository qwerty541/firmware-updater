use std::thread;
use std::time::Duration;

fn main() {
    for _ in 0..=5 {
        thread::spawn(|| {
            println!("Starting sleeping for 10 hours...");
            thread::sleep(Duration::from_secs(60 * 60 * 10));
        });
    }

    println!("Starting sleeping for 10 hours...");
    thread::sleep(Duration::from_secs(60 * 60 * 10));
}
